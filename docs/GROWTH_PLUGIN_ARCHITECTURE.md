# Growth Plugin Architecture

Last updated: 2026-06-11.

This document records Growth-local architecture boundaries. Platform rules stay
in the canonical Home AI contract docs referenced by
`docs/HOME_AI_PLATFORM_CONTRACT.md`.

## Architecture Goal

Growth should stay a service-first embedded plugin:

- Home AI owns embedding, same-origin proxying, workspace grants, platform
  workflows, and shared visual/deployment tooling.
- The Growth plugin owns Growth-domain data projections, learner evidence
  writes, evaluation queue processing, Growth learning-coin settlement, audio
  playback, and plugin-local UI behavior.
- Runtime behavior must be extracted through documented API/service boundaries,
  not by copying Home AI server composition into this workspace.

## Runtime Layers

| Layer | Files | Responsibility |
| --- | --- | --- |
| Composition root | `src/app/services.js` | Construct stores and services, wire dependencies, and expose one service graph to routes. |
| HTTP server | `src/app/http-server.js` | Loopback service listener, route dispatch, optional evaluation worker timer. |
| Plugin platform routes | `src/routes/plugin-routes.js` | Manifest, workspace provisioning, and launch-token endpoints. |
| Growth API routes | `src/routes/growth-routes.js` | HTTP parsing, bounded body limits, workspace/registration authorization, and service dispatch. |
| Growth orchestration service | `src/services/growth-service.js` | Read/write orchestration across facade, snapshot, and plugin-owned SQLite providers. |
| Growth read orchestrator | `src/services/growth-read-orchestrator.js` | Explicit provider fallback order for status, board, card, and migration readback. |
| Growth write orchestrator | `src/services/growth-write-orchestrator.js` | Explicit plugin-owned command boundary for learner evidence, reflection, and Growth learning-coin writes. |
| Growth read providers | `src/services/growth-providers/*.js` | Source-specific Home AI facade, plugin SQLite, and snapshot projections. |
| Growth write providers | `src/services/growth-providers/sqlite-write-provider.js` | Source-specific plugin SQLite command adapter for evidence, reflection, and Growth learning-coin writes. |
| Growth service models | `src/services/growth-service-models.js` | Pure bounded status, board, snapshot, card, and migration summary projections used by the orchestration service. |
| Home AI facade client | `src/services/home-ai-growth-facade-client.js` | Bounded Home AI Growth facade HTTP client with base URL normalization and workspace query/header handling. |
| Card generation service | `src/services/learning-card-generation-service.js` | Graph-plus-history card generation orchestration. It creates a graph plan, reads historical summaries, adds graph source summaries, calls authoring, and returns the published card result. |
| Card generation context service | `src/services/learning-card-generation-context-service.js` | Owner UI read-context service for card generation readiness. It returns Fanfan sample eligibility, daily English recipe metadata, graph readiness, suggested graph target, bounded history counts, Gateway configured state, and the `daily_score_once` policy without exposing raw learner content. |
| Card authoring service | `src/services/learning-card-authoring-service.js` | Growth-owned card authoring orchestration. It assembles summary-only graph/mastery/experience input, calls Gateway, runs validation/repair policy, and delegates accepted drafts to an injected publisher. |
| Gateway authoring client | `src/services/growth-gateway-authoring-client.js` | Gateway-only model boundary for card authoring. It supports SSE and JSON Gateway responses and does not call model vendors directly. |
| Card authoring validation | `src/services/learning-card-authoring-validation-service.js` | Authoring draft validator for JSON parsing, `teachingFlow`, role policy, graph binding consistency, privacy, and bounded-content checks. |
| Card authoring SQLite publisher | `src/stores/growth-learning-sqlite/card-authoring-publisher.js` | Transactional publisher for validated authoring drafts. It upserts `learning_task_cards`, writes `learning_card_graph_bindings`, and rolls back on partial failure. |
| Historical authoring summary | `src/stores/growth-learning-sqlite/history-summary.js` | Summary-only historical context reader for generated cards. It exposes card/evaluation/mastery/experience aggregates without raw learner submissions or transcripts. |
| Knowledge Graph import | `src/services/learning-graph-import-service.js`, `src/stores/growth-learning-sqlite/graph-schema.js`, `src/stores/growth-learning-sqlite/graph-repository.js`, `scripts/import-learning-graph-pack.js` | Source-pack parser and native SQLite graph importer for recovered Growth Knowledge Graph seeds. Dry-run is the default; write mode is explicit and imports bounded graph metadata only. |
| Knowledge Graph planning | `src/services/learning-graph-plan-service.js`, `src/services/learning-card-graph-binding-service.js` | Validated plan creation and card binding over native graph nodes. It feeds the protected graph-plus-history generation route and can still be used directly for manual plan/binding workflows. |
| Regenerable card retirement | `src/services/growth-card-retirement-service.js`, `src/stores/growth-learning-sqlite/card-retirement.js`, `scripts/retire-growth-cards.js` | Dry-run-first workspace-scoped retirement of old board projection, pilot, and evergreen cards that can be regenerated. It hides cards from the board without hard-deleting learner history. |
| Evaluation service | `src/services/growth-evaluation-service.js` | Evaluation job claiming, deterministic evaluator boundary, reward settlement callout, and bounded event emission. |
| Plugin authorization service | `src/services/hermes-plugin-service.js` | Registration key checks, workspace-key checks, launch tokens, and Owner-only view target projection. |
| SQLite store facade | `src/stores/growth-learning-sqlite-store.js` | Public plugin-owned SQLite store API used by services. This file should shrink over time as cohesive submodules are extracted. |
| SQLite core helpers | `src/stores/growth-learning-sqlite/core.js` | Shared deterministic helpers for table discovery, dynamic inserts/upserts, bounded parsing, and primitive normalization. |
| SQLite identifiers | `src/stores/growth-learning-sqlite/identifiers.js` | Stable Growth record ids and hashes for submissions, reflections, evaluation jobs, sessions, rewards, ledger entries, and audio blobs. |
| SQLite audio metadata | `src/stores/growth-learning-sqlite/audio-metadata.js` | Bounded audio evidence parsing and public audio DTO projection shared by card projections and playback/backfill logic. |
| SQLite audio repository | `src/stores/growth-learning-sqlite/audio.js` | Plugin-owned audio playback, SQLite BLOB priority reads, bounded legacy file lookup, and historical audio BLOB backfill. |
| SQLite projections | `src/stores/growth-learning-sqlite/projection.js` | Board/card public DTO shaping, lane grouping, sequence visibility, summaries, and bounded submission/evaluation/reflection/reward projections. |
| SQLite evidence writes | `src/stores/growth-learning-sqlite/evidence-writes.js` | Submission/reflection evidence writes, interaction session creation, evidence audio BLOB insertion, legacy kanban card id resolution, pending evaluation job enqueueing, and `daily_score_once` one-submission/one-reflection enforcement. |
| SQLite evaluation jobs | `src/stores/growth-learning-sqlite/evaluation-jobs.js` | Evaluation job listing, claiming, completion, retry/failure state, evaluation context reads, and evaluation record writes. |
| SQLite rewards | `src/stores/growth-learning-sqlite/rewards.js` | Score-proportional daily-card reward settlement, task completion side effects, Growth learning-coin balance, and monthly clear ledger writes. |
| Embedded UI boot | `public/app.js` | Boot/wiring layer for the embedded Growth app. |
| Embedded UI adapters | `public/growth-appearance.js`, `public/growth-api-client.js`, `public/growth-view-model.js`, `public/growth-route-controller.js` | Host appearance mapping, API client/query handling, board/card view-model normalization, and manifest route/action handling. |
| Migrated UI baseline | `public/growth-legacy-*.js`, `public/growth-homeai-legacy.css` | Plugin-owned copy of the migrated Growth UI baseline. Future Growth UI changes happen here, not in Home AI host files. |

## Current Refactor Boundary

The first core-module split is behavior-preserving:

- `core.js` owns shared SQLite helper behavior previously embedded in the large
  store file.
- `identifiers.js` owns stable id generation and keeps the legacy prefixes and
  explicit-id passthrough behavior.
- `audio-metadata.js` owns bounded audio evidence metadata projection shared by
  projection and playback paths.
- `audio.js` owns plugin-owned audio playback and legacy audio BLOB backfill
  while keeping file-system lookup out of the store facade.
- `projection.js` owns read-side board/card DTO shaping and Growth lane
  semantics.
- `evidence-writes.js` owns plugin-owned learner evidence write transactions
  and keeps submission/reflection write behavior out of the store facade.
- `evaluation-jobs.js` owns plugin-owned evaluation queue state and evaluation
  record insertion.
- `rewards.js` owns plugin-owned reward settlement and learning-coin ledger
  operations while keeping platform `Tongbao` exchange outside this refactor.
- `growth-service-models.js` and `home-ai-growth-facade-client.js` keep pure
  service DTO shaping and Home AI facade I/O outside the orchestration service.
- `growth-providers/*` and `growth-read-orchestrator.js` make read-source
  fallback policy explicit instead of embedding it in individual service
  methods.
- `growth-write-orchestrator.js` and `sqlite-write-provider.js` keep
  submission, reflection, and learning-coin commands behind a service-level
  command boundary. The default mode remains read/facade-first; plugin-owned
  writes are enabled only when `GROWTH_DATA_OWNER=plugin` selects the
  plugin-owned SQLite data path.
- `learning-graph-import-service.js`, `graph-schema.js`, and
  `graph-repository.js` own the native source-pack import boundary for
  recovered graph seeds. Dry-run validates source metadata, required graph
  fields, prerequisite endpoints/cycles, privacy markers, raw-content risk
  keys, and source-document path safety. Write mode creates `learning_graph_*`
  tables and imports bounded metadata only.
- `learning-graph-plan-service.js` and
  `learning-card-graph-binding-service.js` own graph plan and card-binding
  validation. `growth-routes.js` exposes them only through workspace-bearer
  write routes:
  `POST /api/v1/growth/graph/plans` and
  `POST /api/v1/growth/cards/:taskCardId/graph-binding`. Route glue normalizes
  snake_case/camelCase input and binds the card id from the URL.
- `growth-card-retirement-service.js`, `card-retirement.js`, and
  `retire-growth-cards.js` own old card projection cleanup. They retire
  regenerable, non-graph-bound rows from `learning_task_cards` instead of
  deleting related learner evidence, and they cancel open evaluation jobs for
  retired cards.
- Card generation belongs inside this Growth plugin. Home AI may provide the
  Gateway access/config boundary, but card authoring must not import or call
  Home AI old Growth route/server internals and must not call model vendors
  directly. The graph-plus-history generation slice is implemented in
  `learning-card-generation-context-service`,
  `learning-card-generation-service`,
  `learning-card-authoring-service`,
  `growth-gateway-authoring-client`, and
  `learning-card-authoring-validation-service`, with `history-summary` and
  `card-authoring-publisher` repositories underneath. The protected runtime
  route is `POST /api/v1/growth/cards/generate`; it is workspace-bearer scoped
  and delegates to services. The publisher writes the generated task card and
  graph binding in one SQLite transaction. Generated daily cards use the
  `daily_score_once` completion policy: one submission evaluation, one
  optional reflection, completion after the first evaluation, and
  score-proportional rewards without a pass-line gate.
- Owner card generation management is exposed through the embedded plugin UI.
  The Owner `生成` tab reads
  `GET /api/v1/growth/card-generation/context`, keeps learner targets separate
  from the Owner actor, and posts generation requests to
  `POST /api/v1/growth/cards/generate`. The frontend never calls Gateway or
  model vendors directly.
- `growth-appearance.js`, `growth-api-client.js`, `growth-view-model.js`, and
  `growth-route-controller.js` keep host integration, API calls, UI
  normalization, and route/action resolution outside the boot script.
- `growth-learning-sqlite-store.js` remains the public facade while deeper
  modules are extracted.

This keeps service contracts stable while making future extractions smaller and
easier to verify.

## Next Extraction Targets

The current core architecture target is implemented. Future extractions should
be feature-driven:

1. Add a Growth-domain event dispatcher only when submission, reflection,
   evaluation, reward, notification, or audit behavior needs durable fan-out.
2. Split the SQLite store facade into narrower repository interfaces only when
   callers need independent composition of evidence, reward, audio,
   evaluation, or projection repositories.
3. Split legacy UI renderers only when the migrated UI baseline is redesigned;
   do not refactor those files only for shape.

## Harness Map

| Boundary | Required checks |
| --- | --- |
| SQLite core helpers and identifiers | `node --test tests/growth-learning-sqlite-core.test.js` |
| SQLite audio playback and backfill | `node --test tests/growth-learning-sqlite-audio.test.js` |
| SQLite public projections | `node --test tests/growth-learning-sqlite-projection.test.js` |
| SQLite evidence writes | `node --test tests/growth-learning-sqlite-evidence-writes.test.js` |
| SQLite evaluation queue and records | `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js` |
| SQLite rewards and learning coin ledger | `node --test tests/growth-learning-sqlite-rewards.test.js` |
| Regenerable card retirement | `node --test tests/growth-card-retirement-service.test.js` |
| SQLite store facade behavior | `node --test tests/growth-learning-sqlite-store.test.js` |
| Growth service models and facade client | `node --test tests/growth-service-models.test.js tests/growth-service.test.js` |
| Growth service providers and fallback policy | `node --test tests/growth-service-providers.test.js tests/growth-service.test.js` |
| Growth service write providers and command policy | `node --test tests/growth-service-write-providers.test.js tests/growth-service.test.js tests/growth-routes.test.js` |
| Growth Knowledge Graph import | `node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js` |
| Growth Knowledge Graph plan and binding | `node --test tests/learning-graph-plan-binding-service.test.js tests/growth-routes.test.js` |
| Growth card authoring and generation boundary | `node scripts/check-growth-card-authoring-boundary.js && node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-routes.test.js` |
| Embedded frontend adapters and card generation UI | `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js` |
| Architecture boundary guard | `node --test tests/growth-architecture-boundary.test.js` |
| Growth route authorization and HTTP contracts | `node --test tests/growth-routes.test.js` |
| Growth service facade/snapshot/provider selection | `node --test tests/growth-service.test.js` |
| MCP schema and wrapper boundary | `node --test tests/growth-mcp-schemas.test.js tests/growth-mcp-wrapper.test.js` |
| Embedded scroll/layout contract | `node --test tests/growth-embedded-layout.test.js` |
| Full local gate | `npm run check && npm test && git diff --check` |

## Rules For Future Changes

- Route modules should remain HTTP glue. If a route grows business branching,
  move it to a service.
- Store submodules should expose deterministic functions over `db` and plain
  inputs. They should not read env vars, launch services, or call Home AI.
- Growth card authoring must call models only through Gateway. Do not add
  direct vendor clients, provider API keys, or provider endpoints to Growth
  authoring code.
- Public projections must stay bounded. Do not expose raw private file paths,
  raw access keys, launch tokens, full prompts, or unbounded learner payloads.
- New Growth-domain workflows must add focused tests at the module boundary
  before broad `npm test`.
- Platform `Tongbao` exchange remains outside this plugin-internal refactor.
