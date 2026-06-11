#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createGrowthCardRetirementService } = require("../src/services/growth-card-retirement-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

function usage() {
  return [
    "Usage:",
    "  node scripts/retire-growth-cards.js --target-db <plugin.sqlite3> --workspace-id <id> [--dry-run|--write] [--json]",
    "",
    "Options:",
    "  --include-hidden       Also retire already hidden cancelled/superseded cards.",
    "  --exclude-completed    Leave completed/done/closed cards visible/addressable on board.",
    "  --include-graph-bound  Allow retirement of cards that already have native graph bindings.",
    "  --task-card-id <id>    Limit to one card id; can be repeated.",
    "  --reason <text>        Bounded retirement reason.",
    "  --backup-dir <dir>     Override backup directory for write mode.",
    "",
    "Default mode is dry-run. Write mode creates a SQLite backup and never hard-deletes rows."
  ].join("\n");
}

function parseArgs(argv) {
  const out = {
    dryRun: false,
    write: false,
    json: false,
    includeHidden: false,
    includeCompleted: true,
    includeGraphBound: false,
    taskCardIds: []
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target-db") out.targetDb = argv[++index];
    else if (arg === "--workspace-id") out.workspaceId = argv[++index];
    else if (arg === "--backup-dir") out.backupDir = argv[++index];
    else if (arg === "--reason") out.reason = argv[++index];
    else if (arg === "--task-card-id") out.taskCardIds.push(argv[++index]);
    else if (arg === "--include-hidden") out.includeHidden = true;
    else if (arg === "--exclude-completed") out.includeCompleted = false;
    else if (arg === "--include-graph-bound") out.includeGraphBound = true;
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

function assertPath(value, name) {
  const resolved = path.resolve(String(value || ""));
  if (!resolved || resolved === path.parse(resolved).root) throw new Error(`${name} is required`);
  return resolved;
}

function checkpoint(targetDb) {
  const db = new DatabaseSync(targetDb);
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    const quick = db.prepare("PRAGMA quick_check").get()?.quick_check || "";
    if (quick !== "ok") throw new Error(`target quick_check failed: ${quick}`);
    return quick;
  } finally {
    db.close();
  }
}

function backupDatabase(targetDb, backupDir) {
  const backup = path.join(
    backupDir || path.join(path.dirname(targetDb), "backups"),
    `growth-learning-before-card-retirement-${nowStamp()}.sqlite3`
  );
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  checkpoint(targetDb);
  fs.copyFileSync(targetDb, backup);
  return backup;
}

function readBoardSummary(targetDb, workspaceId) {
  const store = createGrowthLearningSqliteStore({ dbPath: targetDb });
  const board = store.board({ workspaceId });
  return board ? {
    source: board.source,
    card_count: board.summary?.cardCount || 0,
    total_card_count: board.summary?.totalCardCount || 0,
    hidden_future_card_count: board.summary?.hiddenFutureCardCount || 0,
    lane_counts: Object.fromEntries((board.lanes || []).map((lane) => [lane.id, lane.count]))
  } : null;
}

function run(options = {}) {
  const targetDb = assertPath(options.targetDb, "--target-db");
  const workspaceId = String(options.workspaceId || "").trim();
  if (!workspaceId) throw new Error("--workspace-id is required");
  if (!fs.existsSync(targetDb)) throw new Error(`Target DB does not exist: ${targetDb}`);

  const before = readBoardSummary(targetDb, workspaceId);
  const store = createGrowthLearningSqliteStore({ dbPath: targetDb });
  const service = createGrowthCardRetirementService({
    cardRetirementRepository: store.cardRetirementRepository
  });
  const input = {
    workspaceId,
    includeHidden: Boolean(options.includeHidden),
    includeCompleted: options.includeCompleted !== false,
    includeGraphBound: Boolean(options.includeGraphBound),
    taskCardIds: options.taskCardIds || [],
    reason: options.reason || "legacy_projection_retired_for_native_graph_regeneration",
    write: Boolean(options.write)
  };
  const backup = options.write ? backupDatabase(targetDb, options.backupDir) : "";
  const result = service.retireRegenerableCards(input);
  const after = options.write ? readBoardSummary(targetDb, workspaceId) : before;
  const quickCheck = options.write ? checkpoint(targetDb) : "";
  return Object.assign({
    target_db: targetDb,
    workspace_id: workspaceId,
    mode: options.write ? "write" : "dry_run",
    backup,
    before_board: before,
    after_board: after,
    quick_check: quickCheck
  }, result);
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
      console.log(`workspace=${result.workspace_id}`);
      console.log(`candidates=${result.summary?.candidateCount || 0}`);
      if (result.retired_count !== undefined) console.log(`retired=${result.retired_count}`);
      if (result.backup) console.log(`backup=${result.backup}`);
      if (result.after_board) console.log(`boardCards=${result.after_board.card_count}`);
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
