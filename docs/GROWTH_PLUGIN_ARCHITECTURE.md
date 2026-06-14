# Growth Plugin Architecture

Last updated: 2026-06-12.

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
| Card generation service | `src/services/learning-card-generation-service.js` | Graph-plus-history card generation orchestration. It normalizes recipe policy, creates a graph plan, reads historical summaries, adds graph source summaries, calls authoring, returns the published card result, and marks consumed trajectory recommendations accepted after publish. |
| Card generation recipe policy service | `src/services/learning-card-generation-recipe-policy-service.js` | Service-owned recipe catalog and defaults for generated cards. V1 owns `daily_english_v1`, English domain/subject defaults, card schema version, and `daily_score_once` policy so the Owner UI can submit a compact recipe request without graph-policy internals. |
| Card generation context service | `src/services/learning-card-generation-context-service.js` | Owner UI read-context service for card generation readiness. It returns Fanfan sample eligibility, recipe-policy metadata, graph readiness, suggested graph target, explicit next-card recommendation/rationale, bounded history counts, Gateway configured state, and the `daily_score_once` policy without exposing raw learner content. |
| Card recommendation service | `src/services/learning-card-recommendation-service.js` | Summary-only next-card recommendation projection. It promotes the latest pending persisted trajectory `nextRecommendation`, skips consumed statuses, falls back to recomputed profile strategy, and delegates accepted-status writes to the mastery-profile repository. |
| Card next-target service | `src/services/learning-card-next-target-service.js` | Summary-only selector for the default next graph target. It uses the selected learner profile projection and next-card strategy target nodes before falling back to graph suggestions, carries selected recommendation lifecycle metadata, and delegates accepted-status writes after generation publishes. |
| Card authoring service | `src/services/learning-card-authoring-service.js` | Growth-owned card authoring orchestration. It assembles summary-only graph/mastery/experience input, calls Gateway, runs validation/repair policy, and delegates accepted drafts to an injected publisher. |
| Gateway authoring client | `src/services/growth-gateway-authoring-client.js` | Gateway-only model boundary for card authoring. It supports SSE and JSON Gateway responses and does not call model vendors directly. |
| Card authoring validation | `src/services/learning-card-authoring-validation-service.js` | Authoring draft validator for JSON parsing, `teachingFlow`, role policy, graph binding consistency, privacy, and bounded-content checks. |
| Card evaluation service | `src/services/learning-card-evaluation-service.js` | Growth-owned Gateway evaluation orchestration. It assembles bounded authenticated evaluation input, parses Gateway output as an evaluation draft, validates schema/graph/privacy policy, and returns the same evaluator DTO consumed by `growth-evaluation-service`. |
| Gateway evaluation client | `src/services/growth-gateway-evaluation-client.js` | Gateway-only model boundary for card evaluation. It supports fake harness `{ kind, input }`, official Gateway `/v1/responses`, SSE, JSON, timeout handling, and no direct model-vendor calls. |
| Evaluation owner review service | `src/services/learning-evaluation-owner-review-service.js` | Owner-only recovery orchestration for terminal failed evaluation jobs. It validates the target, delegates requeue to the SQLite evaluation-job repository, returns bounded retry status, and never calls Gateway or stores raw learner content. |
| Mastery profile service | `src/services/learning-mastery-profile-service.js` | Summary-only evaluation-to-profile updater. It derives bounded evidence, updates `learning_growth_mastery_states`, records safe experience signals, and rejects raw learner/private content in durable profile rows. |
| Card trajectory service | `src/services/learning-card-trajectory-service.js` | Idempotent trajectory writer for evaluated cards. It records strategy, graph targets, strengths, remaining weaknesses, mastery changes, and a pending next recommendation in `learning_growth_card_trajectories`, and supersedes older pending recommendations for the same learner/program. |
| Experience signal service | `src/services/learning-experience-signal-service.js` | Learner feedback writer for `too_easy`, `right_level`, `too_hard`, and `not_learned` signals. It validates graph target anchors, rejects raw/private fields, writes `sourceType=learner_feedback`, and returns summary-only signal DTOs. |
| Stage assessment service | `src/services/learning-stage-assessment-service.js` | Formal assessment eligibility and activation policy. It reads the selected learner profile projection, applies recent-practice/high-pressure/cooldown rules, records cycle state, and activates `stage_assessment` generation with cycle metadata. |
| Next-card strategy service | `src/services/learning-next-card-strategy-service.js` | Deterministic strategy selector over mastery summary, experience signals, and trajectory. It chooses repair/stabilize/transfer/stretch/integrate/review before card generation. |
| Learning profile projection service | `src/services/learning-profile-projection-service.js` | Owner/UI-safe read projection over mastery states, recent experience signals, recent card trajectory, and next-card strategy. It returns summary-only profile context for generation views without raw answers, transcripts, prompts, or source refs. |
| Card authoring SQLite publisher | `src/stores/growth-learning-sqlite/card-authoring-publisher.js` | Transactional publisher for validated authoring drafts. It creates missing FK parent rows in `learning_programs` and `learning_plan_drafts`, upserts `learning_task_cards`, writes `learning_card_graph_bindings`, and rolls back on partial failure. |
| Historical authoring summary | `src/stores/growth-learning-sqlite/history-summary.js` | Summary-only historical context reader for generated cards. It exposes card/evaluation/mastery/experience aggregates without raw learner submissions or transcripts. |
| Stage assessment cycles | `src/stores/growth-learning-sqlite/stage-assessment-cycles.js` | SQLite repository for `learning_growth_stage_assessment_cycles`. It supports imported Home AI schema variants such as `learner_workspace_id`, writes summary-only activation state, and returns public cycle DTOs. |
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
| SQLite projections | `src/stores/growth-learning-sqlite/projection.js` | Board/card public DTO shaping, lane grouping, sequence visibility, summaries, bounded submission/evaluation/evaluation-job/reflection/reward projections, `daily_score_once` completion projection, and visible `evaluation_failed` state for exhausted evaluation jobs. |
| SQLite evidence writes | `src/stores/growth-learning-sqlite/evidence-writes.js` | Submission/reflection evidence writes, interaction session creation, evidence audio BLOB insertion, legacy kanban card id resolution, pending evaluation job enqueueing, and `daily_score_once` one-submission/one-reflection enforcement. |
| SQLite evaluation jobs | `src/stores/growth-learning-sqlite/evaluation-jobs.js` | Evaluation job listing, lease-based claiming, stale-processing recovery, completion, retry/failure state, evaluation context reads, and evaluation record writes. |
| SQLite rewards | `src/stores/growth-learning-sqlite/rewards.js` | Score-proportional daily-card reward settlement, task completion side effects, Growth learning-coin balance, and monthly clear ledger writes. |
| Embedded UI boot | `public/app.js` | Boot/wiring layer for the embedded Growth app. |
| Embedded UI adapters | `public/growth-appearance.js`, `public/growth-api-client.js`, `public/growth-view-model.js`, `public/growth-route-controller.js`, `public/growth-navigation-controller.js` | Host appearance mapping, API client/query handling, board/card view-model normalization, manifest route/action handling, and plugin-owned secondary-view back/navigation state. The API client includes card generation and stage-assessment eligibility/activation helpers. |
| Embedded card interaction UI | `public/growth-legacy-task-ui.js`, `public/growth-card-interaction-controller.js`, `public/growth-card-generation-ui.js`, `public/app.js`, `public/growth-api-client.js` | Generated card learner interaction and Owner generation surfaces. Learner cards support one submission, visible evaluation refresh, optional one-time reflection, and text/audio evidence routed through plugin APIs. Owner generation supports daily cards, visible next-card recommendation rationale, and stage-assessment eligibility/Owner manual activation controls. Controllers own ephemeral UI state while service/store rules remain backend-owned. |
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
  semantics. For generated daily cards, any terminal `daily_score_once`
  evaluation projects to completed/review state regardless of pass line or
  legacy revision wording; formal assessment cards keep the older
  revision/reflection lanes.
- `evidence-writes.js` owns plugin-owned learner evidence write transactions
  and keeps submission/reflection write behavior out of the store facade.
- `evaluation-jobs.js` owns plugin-owned evaluation queue state, Owner retry
  requeue state, bounded Owner-review audit metadata, and evaluation record
  insertion.
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
  `learning-card-recommendation-service`,
  `learning-card-next-target-service`,
  `learning-card-authoring-service`,
  `growth-gateway-authoring-client`, and
  `learning-card-authoring-validation-service`, with `history-summary` and
  `card-authoring-publisher` repositories underneath. The protected runtime
  route is `POST /api/v1/growth/cards/generate`; it is workspace-bearer scoped
  and delegates to services. The publisher writes any missing native
  program/draft parent rows, the generated task card, and graph binding in one
  SQLite transaction. Generated daily cards use the
  `daily_score_once` completion policy: one submission evaluation, one
  optional reflection, completion after the first evaluation, and
  score-proportional rewards without a pass-line gate.
  `growth-gateway-authoring-client` can speak the fake harness `{ kind,
  input }` protocol and the official Gateway `/v1/responses` protocol. The
  latter is selected by `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses` or by a
  `/v1/responses` endpoint, and it keeps model prompting inside Growth while
  provider credentials remain behind Gateway.
- If Owner does not hand-pick a target for daily generation,
  `learning-card-next-target-service` selects a graph node from
  `learning-card-recommendation-service` first. That recommendation service
  promotes the selected learner's latest pending trajectory
  `nextRecommendation` before falling back to the summary-only profile
  strategy. Legacy recommendations without a status are treated as pending,
  while accepted/skipped/expired/superseded recommendations are ignored. When a
  new trajectory recommendation is written, older pending recommendations for
  the same learner/program are marked superseded so a later accepted generation
  cannot fall back to stale work. Generic graph suggestions are used only after
  those learner-specific candidates fail to resolve. The generation context
  preview and actual generation route share this service so the shown suggested
  plan, visible recommendation rationale, and published card do not diverge.
  After a generated card publishes, `learning-card-generation-service` asks the
  next-target/recommendation services to mark the consumed trajectory
  recommendation accepted using only bounded ids and timestamps.
- Stage assessment activation is a separate Growth-owned service boundary.
  `learning-stage-assessment-service` reads summary-only profile projection,
  writes `learning_growth_stage_assessment_cycles` through
  `stage-assessment-cycles`, and calls
  `learning-card-generation-service` only after policy accepts activation.
  Routes remain HTTP glue:
  `POST /api/v1/growth/stage-assessments/eligibility`,
  `POST /api/v1/growth/stage-assessments/activate`, and
  `POST /api/v1/growth/stage-assessments/challenge`.
  Owner manual activation requires Owner role. Learner challenge activation is
  limited to the executor's own workspace and respects hard cooldown. Generated
  formal cards carry `stageAssessmentCycleId`, activation metadata,
  `formal_assessment` completion metadata, default `300` coin reward metadata,
  and mastery evidence weight `1`.
- The AI card loop is Growth-owned. `learning-mastery-profile-service`,
  `learning-card-trajectory-service`, and `learning-next-card-strategy-service`
  close the first service slice from evaluation evidence to profile update,
  trajectory, and next-card strategy. Evaluation is the evidence boundary;
  reward settlement must not directly mutate mastery state. See
  `docs/GROWTH_AI_CARD_LOOP.md`.
- Gateway-backed evaluation is Growth-owned. `learning-card-evaluation-service`
  calls `growth-gateway-evaluation-client` only when
  `GROWTH_GATEWAY_EVALUATION_ENDPOINT` is configured; otherwise
  `growth-evaluation-service` keeps the deterministic evaluator as the local
  fallback. Gateway is the only model boundary for Growth card evaluation.
  The client supports the fake harness `{ kind, input }` protocol and the
  official Gateway `/v1/responses` protocol, selected by
  `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses` or inferred from a
  `/v1/responses` endpoint. Output is an evaluation draft until validation
  accepts schema `growth.card.evaluation.v1`, daily-card policy,
  `skillResults` graph bindings, and privacy and bounded-content scans.
  Invalid JSON, empty output, missing fields, privacy-risk fields, timeout, or
  repair pass failure must not write a partial `learning_evaluations` row. If
  retries are exhausted and no evaluation row exists, `projection.js` exposes a
  bounded `latestEvaluationJob` plus `evaluation_failed` lane/action so the
  learner sees a visible failure and Owner-review path instead of a hidden
  waiting state.
- Owner profile/trajectory projection is Growth-owned. The Owner card
  generation view reads the selected learner's `learningProfile` from
  `learning-profile-projection-service` through
  `learning-card-generation-context-service`. This projection includes bounded
  mastery states, strengths, weaknesses, recent experience signals, recent
  trajectories, and the explicit next-card recommendation reason. It is read-only and must use
  the selected target workspace, not the Owner workspace, when Owner is viewing
  another learner. It must not expose raw answers, transcripts, prompts, answer
  keys, raw model output, private file paths, or repository source refs.
- Owner card generation management is exposed through the embedded plugin UI.
  The Owner `生成` tab reads
  `GET /api/v1/growth/card-generation/context`, keeps learner targets separate
  from the Owner actor, renders the selected learner's profile/trajectory
  projection, and posts generation requests to
  `POST /api/v1/growth/cards/generate`. The frontend never calls Gateway or
  model vendors directly. Through the Home AI same-origin plugin proxy, write
  requests receive the server-side `.hermes-growth/access-key.txt` bearer after
  Hermes workspace access is checked; direct plugin-port writes still require
  the bearer explicitly.
- `growth-appearance.js`, `growth-api-client.js`, `growth-view-model.js`, and
  `growth-route-controller.js` keep host integration, API calls, UI
  normalization, and route/action resolution outside the boot script.
- Generated card interaction is now plugin-local: `growth-legacy-task-ui.js`
  renders the old-style vertical card-detail workflow for generated daily
  cards: status rail, score policy, learning target, lesson, guided practice,
  submission, audio recorder, evaluation, optional reflection, and completion
  feedback;
  `growth-navigation-controller.js` owns plugin navigation state for Growth
  secondary views, emits `growth.plugin.navigation`, consumes
  `hermes.plugin.back` while a card detail is open, and returns
  `growth.plugin.back_result` so Home AI right-swipe goes back to the Growth
  list before leaving the plugin;
  `growth-card-interaction-controller.js` owns browser recording state,
  record/play MIME selection, local preview playback errors,
  submission/reflection event flow, visible error messages, and evaluation
  refresh calls; `growth-api-client.js` exposes card
  fetch/submission/evaluation/reflection helpers plus embedded-proxy audio URL
  resolution; `app.js` wires page state and route calls only.
  One-submission/one-reflection, evaluation, and reward completion rules still
  live in `evidence-writes.js`, `growth-evaluation-service.js`, and
  `rewards.js`.
- SQLite audio projection preserves playback containers: explicit non-generic
  stored audio MIME values are honored, `.webm` is served as `audio/webm`, and
  legacy `.ogg` / `.opus` records remain `audio/ogg`. This boundary prevents
  plugin-owned audio routes from returning a playable WebM BLOB with an Ogg
  content type.
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
| SQLite evaluation queue, Owner retry, and records | `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/learning-evaluation-owner-review-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| SQLite rewards and learning coin ledger | `node --test tests/growth-learning-sqlite-rewards.test.js` |
| Regenerable card retirement | `node --test tests/growth-card-retirement-service.test.js` |
| SQLite store facade behavior | `node --test tests/growth-learning-sqlite-store.test.js` |
| Growth service models and facade client | `node --test tests/growth-service-models.test.js tests/growth-service.test.js` |
| Growth service providers and fallback policy | `node --test tests/growth-service-providers.test.js tests/growth-service.test.js` |
| Growth service write providers and command policy | `node --test tests/growth-service-write-providers.test.js tests/growth-service.test.js tests/growth-routes.test.js` |
| Growth Knowledge Graph import | `node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js` |
| Growth Knowledge Graph plan and binding | `node --test tests/learning-graph-plan-binding-service.test.js tests/growth-routes.test.js` |
| Growth card authoring and generation boundary | `node scripts/check-growth-card-authoring-boundary.js && node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-card-next-target-service.test.js tests/growth-routes.test.js` |
| Growth AI card loop profile, trajectory, recommendation lifecycle, strategy, projection, Gateway evaluation, and Owner recovery | `node --test tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-next-card-strategy-service.test.js tests/growth-evaluation-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-next-target-service.test.js tests/learning-evaluation-owner-review-service.test.js` |
| Growth learner experience signal writes | `node --test tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-frontend-adapter.test.js` |
| Embedded frontend adapters, card generation UI, learner card interaction UI, and Owner evaluation retry action | `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js` |
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
