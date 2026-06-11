# Home AI Platform Contract Pointer

Last updated: 2026-06-11.
Home AI platform contract version: `20260611-v3`.

## Scope

Growth is a planned standard Home AI embedded plugin. This file records only
Growth-local facts and points back to the canonical Home AI platform contract.

The current Growth plugin workspace is in migration stage. The existing mature
Growth code still lives in the Home AI built-in Growth module and must be
extracted through an explicit service/API boundary rather than by copying the
Home AI server into this plugin. The plugin can read the Home AI
`/api/growth/v1/*` facade, import bounded board/card projections into its
local snapshot store with readback metadata, normalize bounded Growth events,
persist them through a local outbox, deliver them to the Home AI plugin
notification endpoint when Home AI API credentials are configured, and expose a
read-only MCP schema, workspace-key execute endpoint, workspace-bound stdio
wrapper for bounded status, board, card list, and card detail projections, and
plugin-owned playback routes for migrated submission/reflection audio. It also
has a plugin-owned SQLite migration/readback path for full learning-growth
table copies from an explicit backup or development copy, plus a
workspace-bearer submission write endpoint that persists new text/audio
evidence and queues a pending Growth evaluation job, and a lightweight
evaluation processor that writes bounded evaluation records, plus plugin-owned
reflection evidence writes. The Mac production embedded plugin path now uses
this SQLite read path when
`GROWTH_DATA_OWNER=plugin` is set.

## Canonical Home AI Docs

Read these Home AI docs before changing deployment, MCP tools, mobile visual
behavior, plugin provisioning, or cross-plugin reference behavior:

- `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/plugin-workspace-platform-contract.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/plugin-mobile-ui-visual-contract.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/macos-dev-to-production-deployment-contract.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/RUNBOOKS/macos-production-access.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/RUNBOOKS/mcp-tool-upgrade-closure.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/RUNBOOKS/macos-ios-simulator-appium.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/MODULES/ai-operations-control-plane.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/ai-operations-control-plane.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/reference-memory-graph-v1.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/reference-memory-graph-harness-plan.md`

## Plugin-Local Facts

Growth-local service/module boundaries are recorded in
`docs/GROWTH_PLUGIN_ARCHITECTURE.md`. That document is plugin-local only; it
does not redefine the Home AI platform contracts below.

Growth-specific product, architecture, implementation, and runbook documents
are indexed in `docs/GROWTH_DOCS_INDEX.md`. Imported Home AI Growth documents
live under `docs/home-ai-growth/` and should be treated as the plugin-local
working copies for future Growth work.

| Field | Value |
| --- | --- |
| `plugin_id` | `growth` |
| `workspace_path_windows` | `not assigned; Mac dev workspace is canonical for Growth migration` |
| `workspace_path_macos_dev` | `/Users/hermes-dev/HermesMobileDev/plugins/growth` |
| `user_entrypoint_symlink` | `/Users/xuxin/Developer/HomeAIDev/growth` |
| `production_source_path_macos` | `/Users/hermes-host/HermesMobile/plugins/growth` |
| `production_data_root_macos` | `/Users/hermes-host/HermesMobile/plugins/growth/data` planned, plus workspace-local `.hermes-growth` bindings |
| `windows_dev_base_url` | `http://127.0.0.1:4881` |
| `macos_dev_base_url` | `http://127.0.0.1:4881` |
| `macos_production_base_url` | `http://127.0.0.1:4881` |
| `launchd_label` | `com.hermesmobile.plugin.growth` |
| `manifest_url` | `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest` |
| `mcp_command` | `node scripts/growth-mcp-wrapper.js --workspace <worker-workspace-root> --api-base-url http://127.0.0.1:4881 --no-workspace-override` |
| `mcp_schema_endpoint` | `GET /api/v1/growth/mcp/schemas` read-only schemas for `growth.get_status`, `growth.get_board`, `growth.list_cards`, and `growth.get_card`. |
| `mcp_execute_endpoint` | `POST /api/v1/growth/mcp/execute` with the workspace-local `.hermes-growth/access-key.txt` bearer and `workspace_id`; executes read-only bounded tools. |
| `mcp_gateway_worker_files` | Home AI materializes `scripts/growth-mcp-wrapper.js` and `src/mcp/growth-mcp-schemas.js` into `<Home-AI-root>/gateway-worker/growth-mcp` before Gateway profile rendering. Copying only the wrapper is invalid because it imports the schema module. |
| `migration_snapshot_import` | `POST /api/v1/growth/migrations/facade-snapshot` with Growth registration bearer; imports bounded Home AI facade board/card projections into plugin snapshot storage. |
| `migration_snapshot_readback` | `GET /api/v1/growth/migrations/readback?workspace_id=<id>` with Growth registration bearer; returns bounded snapshot metadata only. |
| `migration_sqlite_import` | `npm run import:learning-sqlite -- --source-db <backup.sqlite3> --target-db <plugin-data>/growth-learning.sqlite3 --write --workspace-id <workspace>`; copies a verified learning-growth SQLite backup into plugin-owned storage with backup/readback metadata. |
| `migration_sqlite_rollback` | `npm run import:learning-sqlite -- --target-db <plugin-data>/growth-learning.sqlite3 --rollback <backup.sqlite3> --write`; restores the previous plugin-owned SQLite database from the script-created backup. |
| `regenerable_card_retirement` | `node scripts/retire-growth-cards.js --target-db <plugin-data>/growth-learning.sqlite3 --workspace-id <workspace> --dry-run --json`; use `--write` only after dry-run review. Retires old board projection, old KG pilot, and old evergreen cards that can be regenerated, preserving learner history rows. |
| `plugin_learning_db_path` | `GROWTH_LEARNING_DB_PATH`, default `data/growth-learning.sqlite3`. |
| `plugin_data_owner_switch` | `GROWTH_DATA_OWNER=plugin` makes the plugin prefer plugin-owned SQLite for status, board, and card reads. Default remains `home-ai` facade first. |
| `plugin_audio_playback` | `GET /api/v1/growth/audio/submissions/:submissionId` and `GET /api/v1/growth/audio/reflections/:reflectionId`; streams plugin-owned SQLite BLOB audio first, then bounded legacy artifact files for older records. |
| `plugin_submission_write` | `POST /api/v1/growth/cards/:taskCardId/submissions` with the workspace-local `.hermes-growth/access-key.txt` bearer and `workspace_id`; accepts bounded JSON text/audio evidence, resolves native task card ids or legacy `kanban_card_id`, writes plugin-owned submissions/audio BLOBs/sessions, and enqueues pending `learning_growth_evaluation_jobs` rows. |
| `plugin_evaluation_processing` | `POST /api/v1/growth/evaluations/process` with the workspace-local bearer; claims due pending/retry jobs, writes bounded `learning_evaluations`, and marks jobs done/retry/failed. Optional dispatcher is controlled by `GROWTH_EVALUATION_WORKER_ENABLED` and `GROWTH_EVALUATION_WORKER_INTERVAL_MS`. |
| `plugin_reflection_write` | `POST /api/v1/growth/cards/:taskCardId/reflections` with the workspace-local bearer; accepts bounded text/audio reflection evidence, resolves native task card ids or legacy `kanban_card_id`, writes `learning_task_reflections`, and stores optional reflection audio BLOBs. |
| `plugin_graph_plan_write` | `POST /api/v1/growth/graph/plans` with the workspace-local bearer; creates bounded `learning_graph_plans` over imported native graph nodes. This route only writes plans; card publication happens through the generation route or explicit graph-binding route. |
| `plugin_card_graph_binding_write` | `POST /api/v1/growth/cards/:taskCardId/graph-binding` with the workspace-local bearer; binds a task card to an existing graph plan and node coverage using the URL card id as authoritative. |
| `plugin_card_generation_write` | `POST /api/v1/growth/cards/generate` with the workspace-local bearer; creates or accepts a graph plan, summarizes bounded historical Growth SQLite data, calls Gateway through the Growth authoring client, validates the draft, and writes the generated `learning_task_cards` row plus graph binding in one transaction. Generated daily cards carry `daily_score_once`: one evaluation, one optional reflection, completion after the first evaluation, and score-proportional learning-coin settlement without a pass-line gate. When served through the Home AI same-origin plugin proxy, the host attaches the server-side `.hermes-growth/access-key.txt` bearer to proxied write requests after Hermes workspace access is checked. Direct plugin-port writes still require the bearer explicitly. |
| `plugin_card_generation_context_read` | `GET /api/v1/growth/card-generation/context`; Owner UI read context for Growth-owned card generation. It is constrained by Growth view-target visibility, returns Fanfan sample eligibility, daily English recipe metadata, graph readiness, suggested graph target, bounded history counts, and Gateway configured state, and does not expose raw learner submissions, transcripts, prompts, answer keys, or raw model output. |
| `card_authoring_model_boundary` | Growth card generation and authoring are plugin-owned and Gateway-only. The service slice exists in `learning-card-generation-service`, `learning-card-authoring-service`, `growth-gateway-authoring-client`, and `learning-card-authoring-validation-service`, with `history-summary` and `card-authoring-publisher` SQLite repositories underneath. Growth may use Home AI Gateway access/config but must not import Home AI old Growth server logic or call model vendors directly. `growth-gateway-authoring-client` supports the fake harness `{ kind, input }` protocol and official Gateway `/v1/responses` protocol selected by `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses` or inferred from the endpoint. |
| `plugin_view_targets` | `GET /api/v1/growth/view-targets`; returns Growth-provisioned view targets. Through the Home AI proxy, only `x-hermes-plugin-actor-role=owner` receives multiple targets. Workspace actors receive only their current workspace target and cannot enumerate other Growth users. |
| `historical_audio_blob_backfill` | `npm run backfill:audio-blobs -- --db <plugin-data>/growth-learning.sqlite3 --workspace-id <workspace> --legacy-audio-root <Home-AI-data-root> --dry-run --json`; use `--write` only after dry-run shows acceptable `would_backfill`, `file_missing`, and sample evidence. |
| `legacy_audio_roots` | `GROWTH_LEGACY_AUDIO_ROOTS`, path-delimited; optional override for old Home AI artifact roots. If omitted, the plugin derives the standard sibling Home AI `data` root from its workspace. Do not expose raw absolute file paths to clients. |
| `event_endpoint` | `POST /api/v1/growth/events` with Growth registration bearer; queues a bounded Growth event and posts it to Home AI `POST /api/hermes-plugins/growth/notifications` when delivery is configured. |
| `event_outbox_store` | `data/growth-event-outbox.json` by default, override with `GROWTH_EVENT_OUTBOX_STORE_PATH`. |
| `dev_runtime_prerequisites` | Node.js 20+ and npm; no Python dependency yet. |
| `deploy_command` | Use the Home AI Mac access runbook after production service facts are created. |
| `credential_locations` | Workspace-local ignored `.hermes-growth` config/key files only by reference. Do not record raw keys or launch tokens here. |
| `reference_contract_status` | Not implemented. Growth may later expose bounded references to programs, cards, submissions, and mastery profile records. |
| `mobile_visual_harness_status` | Uses the central Home AI visual toolchain for embedded shell validation. Growth iframe roots consume `hermes.plugin.viewport` for host iframe sizing, and mobile layout changes must run the Growth frontend adapter/layout harness plus the Home AI `embedded-plugin-shell` iOS visual harness before production publish. |
| `visual_toolchain_contract` | `20260610-visual-toolchain-shared-lane`; use Home AI central Appium/live-debug/visual harness scripts, not plugin-local copies. |
| `ai_ops_control_plane_command` | `cd /Users/hermes-dev/HermesMobileDev/app && node scripts/ai-ops-control-plane.js intake --task "<task>" --json` |
| `ai_ops_required_flow` | `intake -> required-checks -> lane allocate if visual -> evidence append -> production smoke -> handoff` |
| `ai_ops_evidence_ledger` | `$HOME/.homeai-qa/growth-evidence-ledger.jsonl` |
| `ios_live_debug_available` | `yes`; use Home AI `npm run ios:pwa:debug` after the plugin is registered in the host. |
| `ios_visual_harness_command` | `cd /Users/hermes-dev/HermesMobileDev/app && npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/` |
| `plugin_manifest_actions_status` | `declared`; Growth exposes manifest `actions` for host Dock `常用`, long-press menus, and search. |
| `growth_docs_locality` | `node scripts/check-growth-docs-locality.js`; Growth-specific docs must exist in this plugin workspace, while broad platform contracts remain centralized in the Home AI app workspace. |

## Required Local Validation

Run:

```bash
npm run check
npm test
```

For core SQLite helper and identifier refactors, also run:

```bash
node --test tests/growth-learning-sqlite-core.test.js
```

For SQLite read-projection refactors, also run:

```bash
node --test tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-store.test.js
```

For SQLite audio playback or backfill refactors, also run:

```bash
node --test tests/growth-learning-sqlite-audio.test.js tests/growth-learning-sqlite-store.test.js
```

For SQLite evidence write refactors, also run:

```bash
node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js
```

For SQLite evaluation queue refactors, also run:

```bash
node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js
```

For SQLite reward or learning-coin ledger refactors, also run:

```bash
node --test tests/growth-learning-sqlite-rewards.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js
```

For regenerable card retirement or old board projection cleanup, also run:

```bash
node --test tests/growth-card-retirement-service.test.js tests/growth-learning-sqlite-store.test.js
node scripts/retire-growth-cards.js \
  --target-db <plugin-data>/growth-learning.sqlite3 \
  --workspace-id <workspace-id> \
  --dry-run \
  --json
```

For Growth service orchestration, facade client, or snapshot projection
refactors, also run:

```bash
node --test tests/growth-service-models.test.js tests/growth-service-providers.test.js tests/growth-service.test.js tests/growth-routes.test.js
```

For Growth service write provider or command-boundary refactors, also run:

```bash
node --test tests/growth-service-write-providers.test.js tests/growth-service.test.js tests/growth-routes.test.js
```

For embedded frontend adapter or plugin-route launch refactors, also run:

```bash
node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js
```

For architecture boundary refactors, also run:

```bash
node --test tests/growth-architecture-boundary.test.js
```

For Growth-specific documentation movement or card-generation rule changes,
also run:

```bash
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
```

For Growth card-authoring model boundary changes, also run:

```bash
node scripts/check-growth-card-authoring-boundary.js
node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-routes.test.js
```

For Growth Knowledge Graph source-pack recovery, dry-run import, or native
graph repository changes, also run:

```bash
node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js
node --test tests/learning-graph-plan-binding-service.test.js tests/growth-routes.test.js
node scripts/import-learning-graph-pack.js \
  --source /Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json \
  --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 \
  --dry-run \
  --json
```

Before importing to production, first run the same script with `--write` against
a throwaway SQLite target and verify readback counts. Production write mode
must use the plugin data database, create a timestamped backup, and must not
copy source PDF/HTML bodies or raw private content into runtime tables.

For SQLite migration staging, run a dry-run first:

```bash
npm run import:learning-sqlite -- \
  --source-db <verified-learning-growth-backup.sqlite3> \
  --target-db data/growth-learning.sqlite3 \
  --workspace-id <workspace-id> \
  --dry-run \
  --json
```

Only use `--write` after the source `quick_check`, required table list, and
bounded target readback are clean. The script output is limited to table counts,
integrity/readback metadata, backup path, and board/card counts.

After Home AI host registration is added, also run the central platform
contract checker and the relevant iOS visual harness scenario from the Home AI
main workspace.

## Extraction Boundary

The mature built-in Growth module is the source of business behavior, but it
must be extracted incrementally:

1. stable plugin manifest and provisioning;
2. Home AI facade-backed board projection API;
3. local snapshot store, facade snapshot import, and migration readback;
4. plugin-owned SQLite table migration/readback for board/card projections and
   historical audio playback;
5. submission evidence write extraction with transitional Home AI proxy;
6. async evaluation processing extraction;
7. reflection evidence write extraction;
8. Growth learning coin settlement and mastery profile extraction;
9. MCP write tools and Reference / Memory Graph links.

Growth learning coins are Growth-domain rewards. A completed card may settle
Growth coins inside the plugin and mark the card complete, but it must not
write platform `通宝` ledger entries or trigger real-time conversion.
Growth-coin-to-`通宝` exchange is a Home AI platform currency workflow: it is
administrator-operated, normally monthly, based on total eligible Growth coin
balance, and must remain idempotent and auditable before any `通宝` mutation or
Growth coin clearing occurs.

Monthly exchange must use the Growth coin balance/ledger, not completed-card
state. Card completion has already settled Growth coins. This plugin exposes
`GET /api/v1/growth/learning-coins/balance` and
`POST /api/v1/growth/learning-coins/monthly-exchange-clear` for the
Growth-domain side of administrator exchange. The administrator exchange flow
is monthly by default: Home AI reads the eligible Growth coin balance, applies
the exchange-rate policy, credits platform `通宝`, records audit linkage, and
then calls the plugin clear route. The clear route writes only an idempotent
negative learning-coin ledger entry, zeroes or reduces the exchanged Growth coin
balance, does not write `通宝`, and does not mutate card status. Home AI remains
responsible for administrator authorization, exchange-rate policy, platform
`通宝` ledger credit, and audit linkage.

Growth plugin launch accepts route hints from Home AI. For a card detail launch,
the embedded URL carries `pluginRoute=card&pluginItemId=<taskCardId>`; the
plugin must open that card detail after loading the board. Compatibility Home AI
links using `view=learning&taskCardId=<taskCardId>` are converted by the host
before launch and must not require the plugin to know about the legacy host
view.

Growth plugin launch and viewport broadcasts also carry bounded Home AI
appearance metadata. The plugin maps `pluginTheme`/`theme` and
`pluginFontSize`/`fontSize` onto `document.documentElement.dataset.theme` and
`dataset.fontSize` before rendering the legacy Growth UI, and updates those
values when `hermes.plugin.viewport` or `hermes.plugin.appearance` messages
arrive. Home AI `pluginFontSize=default` maps to the legacy Growth CSS
`standard` size token.

The plugin-owned SQLite board projection must preserve the mature built-in
Growth UI semantics: cancelled, retired, and superseded cards are hidden;
sequence groups show completed cards plus the first current uncompleted card
while later cards are marked as hidden future; and lanes use the Growth
workflow buckets (`ready`, `waiting_ai`, `needs_revision`,
`reflection_required`, `locked_until`, `completed_recent`) instead of generic
active/waiting/completed grouping.

Owner cross-learner viewing is a Growth plugin UI/API responsibility. Home AI
does not pass secrets to enable it; the same-origin proxy sends bounded actor
headers only. The plugin uses `GET /api/v1/growth/view-targets` to build the
right-top switcher. Only Owner actor context may list and switch among all
Growth-provisioned workspaces. Non-Owner workspace actor context receives only
the current Growth workspace target.

The current MCP wrapper is read-only and workspace-bound. It reads
`.hermes-growth/config.json` and `.hermes-growth/access-key.txt`, strips
`workspace_id` from Gateway-facing tool schemas, rejects model-provided
workspace overrides, and injects the bound workspace id into the plugin execute
endpoint. `growth.list_cards` returns summary-only card records and must not
include task instructions or `instructionPreview`. Home AI development Gateway
materialization has been verified for `weixin_stephen`: the workspace
provisioning executor syncs the required worker file set, mirrors
`.hermes-growth` into `/Users/<hm-user>/HermesWorkspace`, renders profile YAML,
and writes `toolsets`, `mcpServers`, and `configPath` back to the Gateway
manifest. Production Gateway callables remain pending until the Growth
production service and first-install deploy are completed.

Do not copy the full Home AI repository, deployment scripts, Gateway runtime,
or central server composition into this plugin.
