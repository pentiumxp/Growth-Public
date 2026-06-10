# Home AI Platform Contract Pointer

Last updated: 2026-06-10.
Home AI platform contract version: `20260609-v2`.

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
read-only MCP schema plus execute endpoint for bounded status, board, card
list, and card detail projections.

Production Mac service deployment is still pending. The loopback production
fields below reserve the standard Home AI plugin runtime contract for Growth;
the central checker marks the Growth Mac probe as deferred until the production
service is installed.

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
| `mcp_command` | planned Gateway wrapper, not production-registered yet |
| `mcp_schema_endpoint` | `GET /api/v1/growth/mcp/schemas` read-only schemas for `growth.get_status`, `growth.get_board`, `growth.list_cards`, and `growth.get_card`. |
| `mcp_execute_endpoint` | `POST /api/v1/growth/mcp/execute` with Growth registration bearer; executes read-only bounded tools. |
| `migration_snapshot_import` | `POST /api/v1/growth/migrations/facade-snapshot` with Growth registration bearer; imports bounded Home AI facade board/card projections into plugin snapshot storage. |
| `migration_snapshot_readback` | `GET /api/v1/growth/migrations/readback?workspace_id=<id>` with Growth registration bearer; returns bounded snapshot metadata only. |
| `event_endpoint` | `POST /api/v1/growth/events` with Growth registration bearer; queues a bounded Growth event and posts it to Home AI `POST /api/hermes-plugins/growth/notifications` when delivery is configured. |
| `event_outbox_store` | `data/growth-event-outbox.json` by default, override with `GROWTH_EVENT_OUTBOX_STORE_PATH`. |
| `dev_runtime_prerequisites` | Node.js 20+ and npm; no Python dependency yet. |
| `deploy_command` | Use the Home AI Mac access runbook after production service facts are created. |
| `credential_locations` | Workspace-local ignored `.hermes-growth` config/key files only by reference. Do not record raw keys or launch tokens here. |
| `reference_contract_status` | Not implemented. Growth may later expose bounded references to programs, cards, submissions, and mastery profile records. |
| `mobile_visual_harness_status` | Not implemented. Embedded shell and keyboard/safe-area validation must use the Home AI iOS visual harness before production integration. |
| `ai_ops_control_plane_command` | `cd /Users/hermes-dev/HermesMobileDev/app && node scripts/ai-ops-control-plane.js intake --task "<task>" --json` |
| `ai_ops_required_flow` | `intake -> required-checks -> lane allocate if visual -> evidence append -> production smoke -> handoff` |
| `ai_ops_evidence_ledger` | `$HOME/.homeai-qa/growth-evidence-ledger.jsonl` |
| `ios_live_debug_available` | `yes`; use Home AI `npm run ios:pwa:debug` after the plugin is registered in the host. |
| `ios_visual_harness_command` | `cd /Users/hermes-dev/HermesMobileDev/app && npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/` |

## Required Local Validation

Run:

```bash
npm run check
npm test
```

After Home AI host registration is added, also run the central platform
contract checker and the relevant iOS visual harness scenario from the Home AI
main workspace.

## Extraction Boundary

The mature built-in Growth module is the source of business behavior, but it
must be extracted incrementally:

1. stable plugin manifest and provisioning;
2. Home AI facade-backed board projection API;
3. local snapshot store, facade snapshot import, and migration readback;
4. card detail and teaching-card workflow;
5. submissions and async evaluation;
6. mastery profile;
7. MCP toolset and Reference / Memory Graph links.

Do not copy the full Home AI repository, deployment scripts, Gateway runtime,
or central server composition into this plugin.
