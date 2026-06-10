# HANDOFF

## Home AI Platform Contract Pointer

- Home AI platform contract version: `20260609-v2`.
- Local pointer: `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Canonical Home AI docs live under:
  `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/`.
- Do not record raw secrets, access keys, workspace keys, launch tokens, or
  private payloads in this handoff.

## 2026-06-10 Growth Plugin SQLite Migration Readback

- Added plugin-owned Growth learning SQLite migration/readback support.
- New files:
  - `src/stores/growth-learning-sqlite-store.js`;
  - `scripts/import-growth-learning-sqlite.js`;
  - `tests/growth-learning-sqlite-store.test.js`.
- New runtime/config fields:
  - `GROWTH_LEARNING_DB_PATH`, default `data/growth-learning.sqlite3`;
  - `GROWTH_DATA_OWNER=plugin` makes status, board, and card reads prefer the
    migrated plugin-owned SQLite store. Default remains Home AI facade first.
- New migration commands:
  - `npm run import:learning-sqlite -- --source-db <verified-backup.sqlite3>
    --target-db data/growth-learning.sqlite3 --workspace-id <workspace-id>
    --dry-run --json`;
  - use `--write` only after source integrity and readback are clean;
  - rollback uses `--rollback <script-created-backup.sqlite3> --write`.
- The migration script validates required learning-growth tables, source
  `PRAGMA quick_check`, foreign-key checks, creates a backup of any existing
  target, copies the source into plugin-owned storage, and returns bounded
  table counts/readback metadata only.
- Current boundary: SQLite read migration is implemented for status/board/card
  projections. Submission, async evaluation, reflection, reward settlement, and
  other write paths remain in Home AI until separate workflow migration tests
  and cutover evidence exist.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-learning-sqlite-store.test.js tests/growth-service.test.js`;
  - `npm test`.
- Development data verification:
  - Home AI created an online SQLite backup copy of Mac production
    `learning-growth.sqlite3` into ignored dev tmp storage;
  - `npm run import:learning-sqlite -- --dry-run --json` passed against that
    source backup;
  - `npm run import:learning-sqlite -- --write --json` imported it into ignored
    plugin dev data;
  - source and target `quick_check` passed, required Growth tables were present,
    and `weixin_stephen` readback returned 48 cards;
  - local plugin service smoke on port `4882` with `GROWTH_DATA_OWNER=plugin`
    returned `growth-plugin-sqlite` for status, board, and card detail.

## 2026-06-10 Growth Facade Card Detail Read Path

- Added a read-only plugin API route:
  `GET /api/v1/growth/cards/:taskCardId`.
- The route reads Home AI facade card detail when
  `GROWTH_HOME_AI_API_BASE_URL` and `GROWTH_HOME_AI_ACCESS_KEY(_PATH)` are
  configured.
- If the facade is unavailable, the route falls back to the local bounded board
  snapshot.
- The embedded UI now renders bounded task cards from
  `GET /api/v1/growth/board` and opens a compact detail panel through the card
  endpoint.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - local HTTP smoke for missing card detail returned bounded 404 JSON.
  - local Playwright mobile-page smoke on `http://127.0.0.1:4881` confirmed
    title/status/empty state rendering and no horizontal overflow.

## 2026-06-10 Clean Growth Plugin Workspace Created

- Archived the two incorrect Home AI full-repository Growth clones:
  - `/Users/hermes-dev/HermesMobileDev/plugins/growth`;
  - `/Users/xuxin/Desktop/growth`.
- Archive location:
  `/Users/hermes-dev/HermesMobileDev/_archived-growth-clones/20260610T002452Z`.
- Created a new clean Growth plugin scaffold at:
  `/Users/hermes-dev/HermesMobileDev/plugins/growth`.
- Initialized the clean workspace as a git repository and pushed it to:
  `git@github.com:pentiumxp/Education.git`.
- The previous remote `Education/main` was preserved before cleanup as:
  `archive/education-pre-growth-plugin-20260610`
  (`8c9e898b7ff21a4318975eba2baf5f75e9b33f57`).
- Current `Education/main` is:
  `55110c98acc670c01b5abb9091b15dcc5f7e9ca2`
  (`chore: scaffold growth plugin workspace`).
- The scaffold includes:
  - embedded plugin manifest endpoint;
  - workspace registration endpoint;
  - launch endpoint placeholder;
  - minimal Growth API and embedded UI;
  - platform contract pointer;
  - focused tests.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - local smoke on `http://127.0.0.1:4881` for manifest, status, board,
    workspace provisioning, and launch.
- The temporary smoke service was stopped and local smoke data was deleted.
- This scaffold is not yet registered in the Home AI host and does not yet own
  the built-in learning-growth data, MCP toolset, or production launchd
  service.

## Next Steps

1. Decide the first extraction boundary from Home AI built-in Growth:
   board projection, card detail, or teaching-card workflow.
2. Add host registration for plugin id `growth` only after the plugin manifest,
   workspace provisioning, and embedded UI harness pass.
3. Add the Growth MCP toolset only after plugin-side data/API ownership is
   explicit.

## 2026-06-10 Growth Workspace-Bound MCP Wrapper

- Changed `POST /api/v1/growth/mcp/execute` from registration-key auth to
  workspace-local `.hermes-growth/access-key.txt` bearer auth.
- Added `pluginService.authorizeWorkspace()` so MCP execute can authorize the
  exact provisioned `growth:<workspace>` binding.
- Added `scripts/growth-mcp-wrapper.js`:
  - reads `.hermes-growth/config.json` and `.hermes-growth/access-key.txt`;
  - requires `--no-workspace-override`;
  - exposes local Gateway tool names `get_status`, `get_board`, `list_cards`,
    and `get_card`;
  - strips `workspace_id` from Gateway-facing tool schemas;
  - rejects model-provided workspace overrides;
  - injects the bound workspace id into plugin HTTP execute calls.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to record the wrapper command and
  workspace-key execute boundary.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - focused route/service/wrapper tests.
- Home AI Gateway profile/callable registration is still pending in the main
  app workspace before production can expose `mcp_growth_*`.
