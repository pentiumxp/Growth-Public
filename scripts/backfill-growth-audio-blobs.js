#!/usr/bin/env node
const path = require("node:path");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

function usage() {
  return [
    "Usage:",
    "  node scripts/backfill-growth-audio-blobs.js --db <plugin.sqlite3> [--workspace-id <id>] [--legacy-audio-root <path> ...] [--limit <n>] [--dry-run|--write] [--json]",
    "",
    "Defaults to dry-run. Use --write only after dry-run count and sample evidence are acceptable."
  ].join("\n");
}

function parseArgs(argv) {
  const out = { dryRun: false, write: false, json: false, legacyAudioRoots: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--db" || arg === "--target-db") out.dbPath = argv[++index];
    else if (arg === "--workspace-id") out.workspaceId = argv[++index];
    else if (arg === "--legacy-audio-root") out.legacyAudioRoots.push(argv[++index]);
    else if (arg === "--limit") out.limit = Number(argv[++index]);
    else if (arg === "--sample-limit") out.sampleLimit = Number(argv[++index]);
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

function assertDbPath(value) {
  const resolved = path.resolve(String(value || ""));
  if (!resolved || resolved === path.parse(resolved).root) throw new Error("--db is required");
  return resolved;
}

function run(options = {}) {
  const dbPath = assertDbPath(options.dbPath);
  const store = createGrowthLearningSqliteStore({
    dbPath,
    legacyAudioRoots: options.legacyAudioRoots || []
  });
  return store.backfillAudioBlobs({
    workspaceId: options.workspaceId,
    limit: options.limit,
    sampleLimit: options.sampleLimit,
    write: Boolean(options.write)
  });
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      process.exit(0);
    }
    const result = run(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`ok=${result.ok === true}`);
      console.log(`mode=${result.mode}`);
      console.log(`scanned=${result.counts?.scanned || 0}`);
      console.log(`wouldBackfill=${result.counts?.would_backfill || 0}`);
      console.log(`backfilled=${result.counts?.backfilled || 0}`);
      console.log(`fileMissing=${result.counts?.file_missing || 0}`);
      console.log(`errors=${result.counts?.errors || 0}`);
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
