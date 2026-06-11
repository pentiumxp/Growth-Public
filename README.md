# Growth Plugin

This workspace is the Home AI Growth plugin.

The previous `growth` directory was a Home AI full-repository clone used for
Growth-focused work. It has been archived and must not be treated as a
production plugin source. The current workspace is intentionally small and will
receive extracted Growth UI/API/domain code through the Home AI plugin
contract. The migrated Growth UI is now plugin-owned source; future Growth UI
changes should be made in this repository, not in the Home AI host legacy
`public/app-learning-*` files.

## Current Scope

- Embedded plugin manifest endpoint.
- Workspace registration endpoint with hashed access-key storage only.
- Launch endpoint placeholder.
- Embedded UI migrated from the previous Home AI Growth page and owned by this
  plugin under `public/growth-legacy-*` and
  `public/growth-homeai-legacy.css`.
- Owner-only learner switcher in the Growth page top-right menu. It lists
  Growth-provisioned workspaces only when embedded through Home AI with Owner
  actor context; workspace users see only their own Growth target.
- Growth API for status and board projection.
- Plugin-owned Growth learning SQLite read model, with snapshot/facade fallback
  helpers retained for migration staging.
- Workspace-bearer submission/reflection writes, async evaluation processing,
  Growth learning-coin settlement, and plugin-owned audio playback.
- Native Growth knowledge-graph import, graph planning, graph binding, and
  Gateway-backed card generation from graph plus historical SQLite summaries.
- Daily generated cards use one evaluation, one optional reflection, and
  score-proportional learning-coin settlement without a pass/fail gate.
- Bounded Growth event outbox and delivery to the Home AI plugin notification
  endpoint.
- Read-only Growth MCP schema and execute endpoint for status, board, card
  list, and card detail projections.

## Documentation

Growth-specific documents are owned by this plugin workspace. Start with:

- `docs/GROWTH_DOCS_INDEX.md`
- `docs/GROWTH_CARD_GENERATION_RULES.md`
- `docs/GROWTH_PLUGIN_ARCHITECTURE.md`
- `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md`
- `docs/HOME_AI_PLATFORM_CONTRACT.md`

Migrated Home AI Growth documents live under `docs/home-ai-growth/` as the
plugin-local working copies. Broad Home AI platform contracts remain in the
Home AI app workspace and are referenced by pointer only.

## Non-Goals

- Platform `通宝` exchange, Action Inbox/Web Push, and Owner manual decision
  workflows remain outside this plugin until each path has a dedicated
  plugin-side contract and cutover evidence.
- Growth card generation must use the Gateway boundary. This plugin must not
  direct-call OpenAI, Claude, DeepSeek, or other model vendors.
- It must not import or mutate Home AI host frontend source at runtime.

## Local Development

```bash
npm run check
npm test
GROWTH_PORT=4881 \
GROWTH_REGISTRATION_KEY=dev-registration-key \
GROWTH_HOME_AI_API_BASE_URL=http://127.0.0.1:8797 \
GROWTH_HOME_AI_ACCESS_KEY_PATH=/path/to/dev/access-key \
npm start
```

Manifest:

```bash
curl http://127.0.0.1:4881/api/v1/hermes/plugin/manifest
```

Growth board facade:

```bash
curl http://127.0.0.1:4881/api/v1/growth/board
```

Import bounded Home AI facade data into the plugin snapshot store:

```bash
GROWTH_HOME_AI_API_BASE_URL=http://127.0.0.1:8797 \
GROWTH_HOME_AI_ACCESS_KEY_PATH=/path/to/dev/access-key \
npm run import:facade-snapshot -- --workspace-id growth:local-dev
```

The import command writes only bounded Growth board/card projections returned
by `/api/growth/v1/*` and prints readback metadata. It must not print raw
Access Keys, launch tokens, learner answers, transcripts, prompts, or local
file paths.

Emit a bounded Growth event into the local outbox and, when Home AI API config
is present, deliver it to the central plugin notification endpoint:

```bash
curl -X POST http://127.0.0.1:4881/api/v1/growth/events \
  -H "Authorization: Bearer $GROWTH_REGISTRATION_KEY" \
  -H "Content-Type: application/json" \
  --data '{"eventId":"event-1","type":"growth.card.completed","workspaceId":"growth:local-dev","taskCardId":"card-1","summary":"Card completed."}'
```

Read-only MCP schema and execution:

```bash
curl http://127.0.0.1:4881/api/v1/growth/mcp/schemas

curl -X POST http://127.0.0.1:4881/api/v1/growth/mcp/execute \
  -H "Authorization: Bearer $GROWTH_REGISTRATION_KEY" \
  -H "Content-Type: application/json" \
  --data '{"name":"growth.get_board","input":{"workspace_id":"growth:local-dev"}}'
```
