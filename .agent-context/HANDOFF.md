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

## 2026-06-10 Growth MCP Dev Gateway Closure

- Tightened plugin MCP execution:
  - `POST /api/v1/growth/mcp/execute` maps the authorized
    `growth:<workspace>` binding back to the Hermes workspace id before calling
    the Growth service, so plugin-owned SQLite reads use `weixin_stephen`
    rather than `growth:weixin_stephen`.
  - `growth.list_cards` now returns summary-only card records:
    `taskCardId`, `title`, `status`, `domain`, `cardRole`, `plannedDate`,
    `nextAction`, `submissionCount`, `evaluationCount`, and `artifactCount`.
    It must not expose `instructionPreview` or full task instructions.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to record that Home AI
  materializes both `scripts/growth-mcp-wrapper.js` and
  `src/mcp/growth-mcp-schemas.js` into `gateway-worker/growth-mcp`; copying
  only the wrapper breaks runtime imports.
- Home AI dev Gateway materialization is now proven for `weixin_stephen`:
  - worker user: `hm-weixin-stephen`;
  - local MCP tool names: `get_status`, `get_board`, `list_cards`, `get_card`;
  - `list_cards` returned 48 plugin-owned SQLite cards with no
    `instructionPreview`;
  - Home AI dev manifest/toolset smoke passed for Growth on `lowgw1`/`lowgw2`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-mcp-schemas.test.js tests/growth-routes.test.js tests/growth-mcp-wrapper.test.js tests/growth-learning-sqlite-store.test.js`.
- Production Growth service/Gateway callables remain pending. Do not claim
  `mcp_growth_*` production availability until Home AI first-install deploy,
  launchd bootstrap, health/proxy smokes, and selected production Gateway
  callable-schema checks pass.

## 2026-06-10 Growth Submission Evidence Write Endpoint

- Added plugin-owned submission evidence writes:
  - `POST /api/v1/growth/cards/:taskCardId/submissions`;
  - workspace bearer authorization via `.hermes-growth/access-key.txt`;
  - bounded JSON body parsing;
  - native task id or legacy `kanban_card_id` lookup;
  - writes `learning_interaction_sessions`, `learning_task_submissions`,
    optional `learning_task_audio_blobs`, and pending
    `learning_growth_evaluation_jobs` rows.
- Updated `src/stores/growth-learning-sqlite-store.js`,
  `src/services/growth-service.js`, `src/routes/growth-routes.js`, and
  `src/routes/http-utils.js`.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to record the new endpoint and
  current extraction boundary.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - focused
    `node --test tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - Home AI host proxy smoke through a temporary `.hermes-growth` binding
    against a temporary copy of the production Growth SQLite DB.
- Development smoke facts:
  - local plugin ran on `127.0.0.1:4892` with `GROWTH_DATA_OWNER=plugin`;
  - direct HTTP submission to legacy card id `t_6c24c957` returned 202 and
    resolved to native task id `ltask_623826dec47f15e5`;
  - temp DB readback showed submission/audio BLOB/pending job,
    `quick_check=ok`, and `foreign_key_check=0`.
- No commit, push, or production deploy has been performed for this step.
- Remaining migration work: async evaluation processing, reflection, reward,
  mastery, Action Inbox/Web Push handoff, Owner manual decisions, and removal
  of the Home AI legacy fallback after production parity evidence.

## 2026-06-10 Growth Evaluation, Reflection, And Coin Settlement

- Added plugin-owned async evaluation processing:
  - `POST /api/v1/growth/evaluations/process`;
  - optional dispatcher via `GROWTH_EVALUATION_WORKER_ENABLED=1` and
    `GROWTH_EVALUATION_WORKER_INTERVAL_MS`;
  - due pending/retry jobs are claimed, evaluated, written to
    `learning_evaluations`, and marked done/retry/failed.
- Added plugin-owned reflection writes:
  - `POST /api/v1/growth/cards/:taskCardId/reflections`;
  - workspace bearer authorization;
  - text/audio evidence writes to `learning_task_reflections` and optional
    `learning_task_audio_blobs`.
- Added per-card Growth learning coin settlement:
  - completed evaluations write idempotent `learning_reward_settlements`;
  - passed cards are marked `completed` and `rewardState=settled`;
  - failed/needs-revision evaluations create blocked settlement state when
    applicable.
- Currency boundary:
  - Growth learning coins are plugin-domain rewards;
  - plugin evaluation does not write platform `通宝` ledger entries and does
    not trigger real-time `通宝` exchange;
  - Growth-coin-to-`通宝` exchange remains an administrator-operated Home AI
    platform workflow, normally monthly, based on total eligible Growth coin
    balance.
- Bounded events:
  - passed evaluations emit `growth.card.completed` and
    `growth.mastery.updated` through the Growth event outbox;
  - needs-revision evaluations emit `growth.review.required`;
  - single-card evaluation workers must not emit real-time
    `growth.reward.requested` for `通宝` conversion.
- Validation passed:
  - `npm run check`;
  - `npm test` with 41 passing tests;
  - focused
    `node --test tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - development smoke against a temporary online backup of production Growth
    SQLite on `127.0.0.1:4897`: submission id and reflection id preserved,
    evaluation completed with score 95, card status became `completed`, Growth
    coin settlement wrote 100 coins, `tongbaoExchange.status=not_requested`,
    `quick_check=ok`, and `foreign_key_check=0`.
- Production deploy is still pending from the Home AI app workspace after both
  app and plugin commits are created.

## 2026-06-10 Growth Evaluation Production Deployed

- Growth plugin commit pushed:
  - `690f8d1` `feat: process growth evaluations in plugin`.
- Home AI app commit pushed:
  - `f9ff704` `feat: proxy growth writes to plugin`.
- Production deployment completed from the Home AI app workspace:
  - Growth plugin source synced to
    `/Users/hermes-host/HermesMobile/plugins/growth`;
  - plugin deploy backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T055814Z-plugin-growth-growth-plugin-evaluation`;
  - `com.hermesmobile.plugin.growth` LaunchDaemon was refreshed through
    `scripts/install-growth-launchd-service.js --execute --bootstrap`.
- Production LaunchDaemon environment now includes:
  - `GROWTH_DATA_OWNER=plugin`;
  - `GROWTH_EVALUATION_WORKER_ENABLED=1`;
  - `GROWTH_EVALUATION_WORKER_INTERVAL_MS=30000`;
  - `GROWTH_LEARNING_DB_PATH=/Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3`.
- Production smoke passed without writing fake learner data:
  - Home AI status smoke ok, client version
    `20260610-growth-plugin-shell-v680`, activeGlobal `0`;
  - Growth status ok with `source=growth-plugin-sqlite`;
  - Growth board for `weixin_stephen` returned 48 cards;
  - host Growth manifest/proxy returned ok/HTTP 200;
  - production Growth SQLite `quick_check=ok`, `foreign_key_check=0`;
  - `weixin_stephen` counts observed: cards `48`, evaluations `24`,
    reward settlements `5`, pending/retry/processing jobs `0`.
- Remaining boundary:
  - monthly administrator Growth-coin-to-`通宝` exchange/clearing workflow is
    not implemented here;
  - production smoke did not create a real learner submission, by design.
