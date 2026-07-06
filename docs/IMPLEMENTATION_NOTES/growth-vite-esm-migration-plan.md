# Growth Vite And ESM Migration Plan

Status: active implementation baseline.
Last updated: 2026-07-06.

## Purpose

This document is the baseline for future Growth frontend modularization, Vite
adoption, and ESM migration work. Future implementation tasks that touch the
Growth embedded frontend should use this plan as the reference architecture
unless a later document explicitly supersedes it.

The goal is to improve maintainability, development feedback speed, test
precision, and frontend architecture clarity without changing Growth's backend
service boundaries, Home AI embedded plugin launch behavior, same-origin proxy
contract, launch-token/workspace authorization model, or mobile visual Harness
obligations.

This is not a one-shot rewrite plan. The migration should proceed as an
incremental Vite island that can coexist with the current static frontend while
each surface is moved behind focused tests and existing embedded-plugin
validation.

## Current Migration State

The first two implementation phases are now source-complete in development:

- Phase 1 established the Vite development island, ESM entry skeleton,
  generated manifest/asset validation, frontend ESM syntax checks, and the
  safe `public/growth-vite-bootstrap-loader.js` bridge.
- Phase 2 established tested ESM boundaries for platform proxy URLs,
  appearance/viewport normalization, API query/request helpers, route
  capability detection, unique task-card routing, and initial host-route
  intents.
- Phase 3 has started with tested ESM model/payload helpers for Owner
  card-generation target selection, target provisioning selection, progress
  steps, release readback/lifecycle payloads, and the first target/progress
  render helpers plus readiness/recipe/history and profile/recommendation
  render helpers plus learning-loop state and profile feedback readback
  helpers. Daily-loop action gating, blocked-reason, selected-plan-item, and
  action-panel render helpers are now covered in ESM. Secondary readback
  disclosure grouping is now covered as an injectable ESM composition layer,
  with reference-chain, cycle drilldown/history, Owner audit/correction, and
  completed-cycle Owner review request/readback rendering available as default
  ESM renderers. Automation readback panels for closed-loop action planning,
  cycle closure, review advancement, proposal review, digest review, and
  failure-policy review, action handoff, scheduler execution, scheduler run,
  and worker-target review are also split into default ESM renderers.
  Stage-assessment status/reason/rubric/control render helpers are now split
  into their own tested ESM module. The Owner card-generation shell now has a
  tested pure ESM composition layer for intro KPIs, learner selection,
  readiness, target provisioning, generation actions, secondary readbacks, and
  plan/card/structured previews. The card-generation event descriptor layer is
  now covered in ESM for legacy `data-*` actions, blocked/disabled button
  handling, release actions, automation actions, scheduler actions, and stage
  assessment controls. The app-shell DOM delegation adapter now has a tested
  ESM skeleton that maps click/change/input/submit events to those descriptors
  and dispatches them through an injected handler. The action dispatcher now
  maps descriptors to explicit injected controller handler names,
  failure-target slots, and legacy handler argument adapters while preserving
  ignored, blocked, missing-handler, and handler-error outcomes. The
  app-controller shell now has a tested pure ESM
  layer that delegates actions through the dispatcher, applies local draft
  field updates, records the last handled action, preserves target provisioning
  draft changes for recipe/domain-pack/subject selection, preserves the
  cycle-history selection cascade through injected refresh actions, and writes
  blocked, missing-handler, and thrown-handler failures into
  legacy-compatible summary-only failure slots. A readback action handler
  factory now covers the first injected handler slice for release artifact
  template, release workbench action audits, release status readbacks, release
  evidence ledger, release lifecycle records, and profile feedback refreshes,
  plus release workbench action recording, release package building, and
  release lifecycle record write wrappers. Automation proposal, digest, failure
  policy, action handoff, scheduler execution/run, scheduler worker-target, and
  recommendation lifecycle write wrappers are also covered with ESM payload
  helpers, including create/review/publish paths where the legacy UI exposes
  them. Proposal publish now preserves the legacy cache/context refresh
  callback sequence through injection while preserving legacy-compatible
  loading/ready/failed, action/package, and automation review state slots.
  The closed-loop action-plan runner is also covered as an injected ESM handler
  that preserves blocked/running/executed/failed slots while delegating
  operating-loop advance, cycle-closure preparation, review advancement, and
  handoff delivery through tested ESM wrappers and injected refresh/API
  dependencies.
  Descriptor-to-legacy argument adapters now cover writeful release,
  automation, scheduler, and recommendation lifecycle actions that still route
  through legacy DOM-like button datasets. Release workbench
  status/action/audit/package render helpers, release artifact
  template/checklist render helpers, release status readback render helpers,
  release status readback subview selectors for controls/dashboard/inventory/
  readiness, release evidence collection and approval row subviews, release
  evidence ledger readback render helpers, and release lifecycle record render
  helpers are now split into release feature modules.
  The Vite
  entry now resolves three tested mount modes: disabled by default on the
  current legacy page, bootstrap-only when a `growth-vite-root` island is
  present, and explicit runtime mode only when `#growth-root` opts in with
  `data-growth-vite-runtime="enabled"`. A local cutover readiness gate now
  checks the Vite mount modes, runtime adapter wiring, migrated program ESM
  surface, theme/viewport bridge ESM surfaces, view-model ESM surface, host
  route/navigation controller ESM surfaces, Phase 5 `legacy-board` façade
  boundary, frontend cutover test coverage, absence of `registerGlobals`, and
  the required pre-deploy blockers; after Owner approval and deploy-lane
  completion it reports `readyForRuntimeEnablement=true`. Central mobile visual
  evidence, Owner approval, deploy-lane completion, production readback, and
  post-deploy visual checks have been accepted in the Owner cutover evidence
  receipt. A separate runtime-boundary checker now
  locks the pre-Owner `public/index.html` shape: classic scripts in
  order, Vite bootstrap loader last, no module script, no runtime opt-in, and
  no direct hashed Vite asset. A minimal project-owned ESM
  store now provides the first state boundary for runtime adapter state access,
  subscription, mutation notification, and future reducer migration without
  introducing a third-party state library. State selectors now cover the first
  route and Owner generation derived-state reads so the ESM runtime can move
  away from scattered `pageState` object access incrementally. The first
  view-model ESM surface now owns the legacy card, board, metrics, and overview
  normalization previously exposed through `window.HermesGrowthViewModel`, and
  the non-active runtime adapter creates a default injected view model for card
  interaction code without requiring the legacy global. The first
  generation reducer now owns local Owner correction/audit draft mutations,
  target-provision draft changes, recipe pre-dispatch state, and cycle-history
  selection state so the app controller can delegate those local transitions
  through a testable state boundary. A route reducer now covers local
  navigation state transitions for tab selection, board-lane filtering, card
  detail open/close, and Owner settings open/close, with store-level reducer
  execution available through `store.reduce`. The host route controller is now
  available as `frontend/src/routing/routeController.js`, preserving manifest
  route application for board, Owner, card-detail, review, submit-work,
  rewards, generation, and stage-assessment routes without depending on
  `window.HermesGrowthRouteController`. The host navigation controller is now
  available as `frontend/src/routing/navigationController.js`, preserving
  history state, parent navigation messages, host back handling, popstate
  restoration, and runtime-adapter bind/unbind behavior in ESM. The first
  page-level ESM shell view now composes the Owner generation route through
  selectors and the tested card-generation panel while preserving the
  bootstrap-only fallback for non-runtime Vite island validation. The runtime
  adapter now exposes the injected route controller and binds/unbinds the
  injected navigation controller, while passing render-time workspace, Owner,
  view-target, and injected renderer context into `renderRoot`; the default
  Vite render path no longer depends on tests manually supplying shell-view
  options. The first task-board page view is now
  split into ESM with tested lane selection, requested empty-lane preservation,
  task-card action attributes, reward/status text, and shell composition when
  overview board data is present. The first selected-card detail page view is
  also split into ESM with tested selected-task resolution, task summary/meta
  projection, missing-card fallback, return-to-board action markup, and an
  injected renderer slot for fuller teaching/native detail implementations.
  The non-active Vite detail route now also has a tested ESM teaching-card
  detail renderer for role badges, share actions, daily flow rails, score
  policy, lesson/guided-practice sections, and the composed card-interaction
  panel when a selected task carries teaching-flow data.
  The first Owner settings page view is now split into ESM with tested
  settings-open precedence, settings tab aliasing, overview KPIs, task
  list/detail routing, reward summary stats, no-learner fallback,
  close-settings action markup, and Owner generation panel injection. The
  standalone rewards page is now also split into ESM with tested coin
  formatting, growth profile, reward-card affordability, ledger/redemption
  rows, daily/reward progress, Owner reward-pool form, learner/Owner copy
  differences, and `rewards` tab shell composition. The Owner workspace page
  shell is now split into ESM with tested learner summary metrics,
  Owner-only target switching menu, current-target disabled state, management
  action markup, route notice rendering, and board-page composition.
  The first program execution summary/list slice is now also split into ESM
  with tested program/task/evaluation status copy, focus labels, draft
  summaries, program cards, task rows/actions, skill chips, evaluation rows,
  daily-plan panel, and execution overview composition. The same ESM module now
  also owns the first native Growth submission/reflection form slice for
  structured questions, text answers, audio-required tasks, recorder controls,
  revision collapse, spoken-reflection prompts, and record-derived next-action
  selection. Native Growth selected-card detail now also has a tested ESM
  renderer for reward policy, sequence strategy, reading material, previous
  submission history, audio-evidence history, recent feedback heads, feedback
  detail, Owner menu, share/return actions, and `CardDetailView` route
  selection. The same ESM module now also covers the parent/admin program
  panel slice with tested review queues, parent review requests, reward
  settlements, launch operation queues, parent weekly report, and parent-admin
  composition. Source/goal setup forms are now also covered in ESM, including
  source create, goal create, foundation import, source-directory import and
  bootstrap controls, foundation learner facts, and program scope defaults. The
  first oversized program-view quality split moved those foundation and
  source/goal helpers into `frontend/src/views/ProgramFoundationView.js`, while
  `frontend/src/views/ProgramExecutionView.js` keeps compatibility re-exports
  for existing callers. The second split moved the Owner program form,
  launch-operation readbacks, review queues, parent weekly report, reward
  settlement list, and parent-admin composition into
  `frontend/src/views/ProgramParentAdminView.js`. The third split moved native
  Growth submission/reflection forms, audio/readback history, reward policy,
  feedback details, reading material, selected-card detail shell, and native
  Growth detail detection into `frontend/src/views/ProgramNativeGrowthDetailView.js`.
  The fourth split moved native Growth submission/reflection forms, structured
  question rendering, recorder controls, and next-action calculation into
  `frontend/src/views/ProgramNativeGrowthSubmissionView.js`, with compatibility
  re-exports through the native-detail and program execution surfaces.
  `ProgramExecutionView.js` is now 387 lines after these cuts and acts as the
  program overview/subsystem compatibility surface before final runtime cutover
  wiring. The first oversized automation-panel quality split moved scheduler
  execution, scheduler run, and worker-target review panels into
  `frontend/src/features/card-generation/AutomationSchedulerPanels.js`, with
  compatibility re-exports through `AutomationPanels.js`. The second
  automation-panel quality split moved proposal, digest, failure-policy, and
  action-handoff review panels into
  `frontend/src/features/card-generation/AutomationReviewPanels.js`, leaving
  `AutomationPanels.js` as the closed-loop/cycle/review-advancement module and
  compatibility export surface.
  Card-interaction migration has started with tested pure ESM submission
  helpers for interaction keys, deterministic score text, saved-audio evidence,
  recorder controls/statuses, submitted-answer status, feedback lists,
  evaluation job status, waiting/failed/completed evaluation panels, and
  Owner retry action markup. Reflection and experience-signal helpers are now
  also split into ESM with tested reflection form/status rendering, reflection
  recorder reuse, reward cap/earned text, completed-card feedback prompts,
  difficulty signal buttons, pending/selected/disabled states, target-node
  attributes, and learner-facing status notes. A first card-interaction
  composition entry now combines quick-check submission form rendering,
  submitted-answer status, evaluation status, reflection, and completed-card
  feedback into one tested pure ESM panel while leaving controller side effects
  and production runtime wiring in the legacy classic-script layer. The first
  card-interaction action/state helper slice is also split into ESM, covering
  workspace fallback order, task-card lookup, message and busy-state writes,
  submission/reflection/experience payload construction, target-node
  normalization, and detail-cache merge behavior without wiring those helpers
  into the production controller yet. The audio recorder lifecycle now has a
  tested injected ESM controller for MIME selection, unsupported-browser
  handling, recorder start/stop, timer updates, stream cleanup, object URL
  cleanup, playback-error state, and audio payload projection with fakeable
  browser primitives. The card-interaction delegated DOM event contract now
  also has a tested ESM helper for legacy `data-*` selector parsing,
  learner-draft mutations, controller dispatch, saved-audio playback errors,
  async error message fallback, and listener cleanup. The non-active Vite
  runtime adapter path now creates and exposes an injected card-interaction
  controller, binds card-interaction delegated DOM events alongside the
  card-generation events, and preserves the explicit opt-in boundary before
  any production runtime cutover.

The active product UI remains the legacy classic-script runtime in
`public/*.js`. The ESM modules under `frontend/src/` are deliberately tested in
parallel first; they must not replace runtime wiring until the relevant adapter
phase has equivalent tests and, for visible UI changes, central visual
validation.

## Platform Constraints

- Growth remains a Home AI embedded plugin.
- The canonical Home AI platform contracts remain under
  `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/`.
- The central plugin workspace contract permits Vite-built plugin-owned
  embedded UI islands when they keep deployment static, use documented APIs or
  plugin bridge boundaries, and preserve PWA/browser behavior when native or
  embedded bridge markers are absent.
- `public/index.html` remains the plugin entry during the migration. It may
  load built ESM assets, but it must keep Home AI proxy, launch, workspace, and
  client-version behavior intact.
- Backend service, route, store, MCP, release-readiness, scheduler, and
  deployment boundaries are out of scope except for adding static asset serving
  or validation needed by the frontend build.

## Target Layout

The backend layout remains:

```text
src/
  app/
  config/
  mcp/
  routes/
  services/
  stores/
```

The new frontend source layout is:

```text
frontend/
  index.html
  src/
    main.js
    app/
    api/
    routing/
    state/
    views/
    components/
    features/
    platform/
    legacy/
    utils/
```

The Vite build output should be deterministic static assets under:

```text
public/assets/growth/
```

During the development migration, this directory is generated by
`npm run build:frontend` and is not committed. A future Owner-approved
production cutover or deploy request must explicitly state whether the deploy
lane should build these assets before sync or whether a later source change
will commit production-ready assets.

The build should emit a Vite manifest so `public/index.html` or a small
postbuild helper can load the current hashed entry asset without hardcoding
stale filenames.

## Target Module Map

### Entry And App Shell

```text
frontend/src/main.js
frontend/src/app/createGrowthApp.js
frontend/src/app/actionDispatcher.js
frontend/src/app/actionAdapters.js
frontend/src/app/actionHandlers.js
frontend/src/app/actionHandlerUtils.js
frontend/src/app/releaseActionHandlers.js
frontend/src/app/appController.js
frontend/src/app/runtimeAdapter.js
frontend/src/app/renderRoot.js
frontend/src/app/domEvents.js
frontend/src/views/GrowthShellView.js
```

Responsibilities:

- bootstrap the Growth embedded frontend;
- read launch context and initial route state;
- own render scheduling and global error boundaries;
- bind global DOM events only at the app shell layer;
- avoid business logic and direct persistence/API implementation.

Current ESM implementation:

- `frontend/src/main.js`
- `frontend/src/app/actionAdapters.js`
- `frontend/src/app/actionDispatcher.js`
- `frontend/src/app/actionHandlerUtils.js`
- `frontend/src/app/actionHandlers.js`
- `frontend/src/app/releaseActionHandlers.js`
- `frontend/src/app/appController.js`
- `frontend/src/app/createGrowthApp.js`
- `frontend/src/app/runtimeAdapter.js`
- `frontend/src/app/renderRoot.js`
- `frontend/src/app/domEvents.js`
- `frontend/src/views/GrowthShellView.js`

Covered behavior includes minimal Vite bootstrap rendering, first page-level
Owner generation shell rendering through `GrowthShellView`, explicit Vite entry
mount-mode resolution, and a pure app-shell DOM delegation adapter that resolves
card-generation controls by event type, converts DOM events to stable action
descriptors, calls `preventDefault` for handled controls, dispatches through an
injected handler, and can unbind all registered listeners. The Vite entry keeps
runtime mode disabled on the current legacy page unless `#growth-root` carries
`data-growth-vite-runtime="enabled"`; a separate `growth-vite-root` continues to
support bootstrap-only island validation. The dispatcher maps descriptors to
explicit controller handler names and failure-target slots, and handles ignored,
blocked, missing handler, and thrown-error outcomes. The controller shell
applies local draft field updates for Owner correction/audit notes, preserves the legacy
`status/error` versus `actionStatus/actionError` failure-slot distinction, and
records the latest handled or failed action. It also preserves special legacy
failure lanes for release package builds, stage checkpoint controls, and blocked
root card-generation actions. Target provisioning draft state for domain-pack
and subject changes is handled locally, while recipe changes update the draft
before dispatch so the injected handler can still reload context.
Cycle-history selection is handled locally and then dispatches the legacy
follow-up refresh cascade for cycle drilldown, reference chain, Owner audit
reviews, profile feedback, and automation action planning.
Descriptor-to-legacy handler adapters now cover the writeful release,
automation, scheduler, and recommendation lifecycle actions that still expect
DOM-like button `dataset` arguments in the legacy closure handlers, and the
dispatcher now invokes those handlers with the adapted argument shape while
leaving readback/refresh handlers on descriptor arguments.
The first handler factory slice keeps readback API calls injected and covers
release/profile refresh handlers that construct summary-only payloads, update
loading/ready/failed slots, preserve lifecycle action slots, and optionally
suppress render calls for silent refreshes. Pure action-handler helper
functions for card-generation state access, context readback patching,
release-workbench action lookup, automation data lookup, and recommendation
lifecycle item lookup now live in `frontend/src/app/actionHandlerUtils.js` so
the handler factory can continue shrinking without changing runtime wiring.
Release refresh handlers and release workbench action, release package build,
and release lifecycle record write wrappers now live in
`frontend/src/app/releaseActionHandlers.js`, with `actionHandlers.js` composing
them through `createReadbackActionHandlers`. The remaining factory now includes
automation/recommendation proposal create/review/publish,
digest create/review, failure-policy create/review, handoff create/deliver,
scheduler execution/run, worker-target create/review, and lifecycle write
wrappers with injected API and refresh callbacks. The closed-loop action-plan
runner also lives in the factory and delegates its downstream operating-loop,
cycle-closure, review-advancement, and handoff-delivery actions through tested
ESM wrappers and injected callbacks. A non-active runtime adapter now wires the
ESM handler factory, controller, delegated DOM events, and render callback
together behind tests, including dispatcher-safe closed-loop runner invocation.
It is connected to the Vite entry only through the explicit runtime opt-in gate;
the committed `public/index.html` does not enable that gate.

### Home AI Platform Bridge

```text
frontend/src/platform/homeAiBridge.js
frontend/src/platform/embeddedContext.js
frontend/src/platform/proxyUrl.js
frontend/src/platform/appearance.js
frontend/src/platform/themeBridge.js
frontend/src/platform/viewportBridge.js
```

Responsibilities:

- normalize Home AI embedded context;
- derive same-origin proxy URLs when embedded;
- handle host theme/font-size messages;
- handle `hermes.plugin.viewport` and keyboard viewport messages;
- expose bounded bridge state to the app store;
- avoid raw launch tokens, access keys, private payloads, or local paths in
  public events.

Current source migration targets:

- `public/growth-appearance.js`
- embedded/proxy parts of `public/growth-api-client.js`
- viewport handling currently consumed by visual Harness scenarios

Current ESM implementation:

- `frontend/src/platform/embeddedContext.js`
- `frontend/src/platform/proxyUrl.js`
- `frontend/src/platform/appearance.js`

### API Client

```text
frontend/src/api/growthApiClient.js
frontend/src/api/queryParams.js
frontend/src/api/request.js
frontend/src/api/routes.js
frontend/src/api/errors.js
```

Responsibilities:

- preserve direct-vs-proxy API routing behavior;
- normalize workspace query and actor context;
- return bounded fetch errors;
- expose typed helper functions for board, card, generation, release,
  automation, and reference surfaces.

Current source migration target:

- `public/growth-api-client.js`

Current ESM implementation:

- `frontend/src/api/growthApiClient.js`
- `frontend/src/api/queryParams.js`
- `frontend/src/api/request.js`

Covered behavior includes direct/proxy API path resolution, workspace query
key selection, workspace query de-duplication, card-generation and
learning-loop query builders, release workbench/status/lifecycle/evidence
query builders, automation proposal/digest/failure-policy/action-handoff/
scheduler/closed-loop query builders, cycle audit/history query builders,
profile feedback, Owner audit, stage-assessment, and reference query builders,
launch-token header injection, JSON post options, bounded fetch error
normalization, workspace URL updates, release evidence/status/lifecycle
aggregate read wrappers, card/detail/submission/evaluation/reference wrappers,
and write wrappers for daily loop, automation, release, Owner audit, runtime
enablement, stage assessment, and recommendation lifecycle operations. The ESM
surface remains non-runtime and does not replace `window.HermesGrowthApiClient`
in `public/app.js`.

### Routing And Host Actions

```text
frontend/src/routing/routeController.js
frontend/src/routing/hostActions.js
frontend/src/routing/lanes.js
frontend/src/routing/growthRoutes.js
frontend/src/routing/initialRoute.js
```

Responsibilities:

- apply host `pluginActionId` / `pluginRoute` state;
- map manifest actions to explicit Growth screens;
- keep lane selection deterministic;
- render visible empty/unavailable route states instead of heuristic card
  fallbacks.

Current source migration target:

- `public/growth-route-controller.js`

Current ESM implementation:

- `frontend/src/routing/growthRoutes.js`
- `frontend/src/routing/initialRoute.js`

Covered behavior includes structured route capability detection,
route-contract constants, unique task-card de-duplication, first matching card
selection, and pure initial host-route intents for `today_tasks`, `cards`,
`submit_work`, `review`, `stage_assessment`, `rewards`, `settings`,
generation aliases, and direct card routes.

### State

```text
frontend/src/state/store.js
frontend/src/state/viewModel.js
frontend/src/state/actions.js
frontend/src/state/selectors.js
frontend/src/state/reducers/
  boardReducer.js
  cardInteractionReducer.js
  generationReducer.js
  ownerReducer.js
  releaseReducer.js
```

Responsibilities:

- replace scattered page state with a small explicit store;
- isolate state transitions from DOM rendering;
- make route, board, generation, release, and card-interaction states
  testable without the full browser adapter Harness.

Do not introduce Redux, Zustand, or another state library unless local state
continues to grow after this split. The first migration should keep a minimal
project-owned store.

Current ESM implementation:

- `frontend/src/state/reducers/generationReducer.js`
- `frontend/src/state/reducers/routeReducer.js`
- `frontend/src/state/selectors.js`
- `frontend/src/state/store.js`
- `frontend/src/state/viewModel.js`

Covered behavior includes shared mutable state access through `getState`,
bounded subscriber registration/unregistration, `select`-based derived reads,
explicit mutation notification reasons, and optional runtime adapter injection
so the ESM app shell can render and notify through one state boundary while
legacy-compatible handlers continue to mutate the existing state object during
the migration. Selector coverage includes route state, card-generation state,
Owner generation workspace selection, selected target eligibility, target
provision selection, and an aggregate Owner generation runtime-state read model.
Generation reducer coverage includes local Owner correction/audit draft fields,
domain-pack and subject selection, recipe pre-dispatch loading state, successful
cycle-history selection, and missing-cycle failure projection.
Route reducer coverage includes tab selection, board-lane filtering, card
detail open/close, settings open/close, and reducer execution through the store
with notifications only when a reducer reports a state change. Runtime adapter
coverage now verifies that default rendering receives host-derived
`currentWorkspaceId`, Owner status, and view-target context. View-model
coverage includes `boardMetrics()`, `createGrowthViewModel()`, normalized card
identity/workspace/status/reward/task-model fields, filtered lane membership,
summary metrics, coin balance projection, launch-operation counts, and the
default runtime-adapter view-model injection path.

### Views

```text
frontend/src/views/GrowthShellView.js
frontend/src/views/BoardView.js
frontend/src/views/CardDetailView.js
frontend/src/views/TeachingCardDetailView.js
frontend/src/views/ProgramExecutionView.js
frontend/src/views/ProgramFoundationView.js
frontend/src/views/ProgramParentAdminView.js
frontend/src/views/ProgramNativeGrowthDetailView.js
frontend/src/views/ProgramNativeGrowthSubmissionView.js
frontend/src/views/OwnerWorkspaceView.js
frontend/src/views/RewardsView.js
frontend/src/views/SettingsView.js
```

Responsibilities:

- compose feature modules into page-level views;
- keep API calls and complex business rules outside view functions;
- preserve current embedded mobile and dark-mode layout behavior.

Current ESM implementation:

- `frontend/src/views/BoardView.js`
- `frontend/src/views/CardDetailView.js`
- `frontend/src/views/TeachingCardDetailView.js`
- `frontend/src/views/ProgramExecutionView.js`
- `frontend/src/views/ProgramFoundationView.js`
- `frontend/src/views/ProgramParentAdminView.js`
- `frontend/src/views/ProgramNativeGrowthDetailView.js`
- `frontend/src/views/ProgramNativeGrowthSubmissionView.js`
- `frontend/src/views/GrowthShellView.js`
- `frontend/src/views/OwnerWorkspaceView.js`
- `frontend/src/views/RewardsView.js`
- `frontend/src/views/SettingsView.js`

Covered behavior includes preserving the bootstrap-only Vite island marker and
composing the Owner `generation` route from selector-derived runtime state,
view-target resolution, and the existing tested Owner card-generation panel.
Selected-card detail coverage now includes the summary/fallback route and the
first teaching-card detail renderer, including legacy `data-*` markers for the
teaching card shell, share action, daily flow rail, score policy, lesson,
guided-practice, return-to-board action, and composed submit/evaluation/
reflection/feedback panel.
Board view coverage includes board lane title/empty/status/reward helpers,
lane-model construction, explicit active-lane filtering including requested
empty lanes, task-card open/history/artifact action attributes, and
`GrowthShellView` composition for overview board state. Card detail coverage
includes selected task id resolution, task lookup across board/program/detail
sources, summary/meta projection, missing-card fallback, return-to-board action
markup, renderer injection, and `GrowthShellView` composition for selected task
state. Settings view coverage includes Owner settings page shell, close action
markup, tab aliasing/selection, overview KPI projection, task list and task
detail routing, reward summary stats, no-learner fallback, Owner generation
panel injection, and `GrowthShellView` precedence when settings are open.
Rewards view coverage includes coin/RMB formatting, growth profile metrics,
daily bars, reward progress, reward-card affordability, ledger and redemption
rows, Owner-only reward-pool form markup, learner/Owner copy differences, and
`GrowthShellView` composition when the active tab is `rewards`. Owner workspace
view coverage includes learner label/workspace selection helpers, target menu
visibility and filtering, current-target disabled state, summary metric
projection, management action markup, route notice rendering, and board-page
composition through `GrowthShellView`.

### Shared Components

```text
frontend/src/components/Button.js
frontend/src/components/IconButton.js
frontend/src/components/StatusPill.js
frontend/src/components/EmptyState.js
frontend/src/components/ErrorBanner.js
frontend/src/components/ProgressRows.js
frontend/src/components/SegmentedControl.js
frontend/src/components/SelectField.js
frontend/src/components/TextArea.js
frontend/src/components/Modal.js
```

Responsibilities:

- reduce repeated HTML string construction;
- standardize compact controls, status rows, and empty/error states;
- keep text escaping and layout attributes consistent.

### Card Generation Feature

```text
frontend/src/features/card-generation/CardGenerationPanel.js
frontend/src/features/card-generation/TargetSelector.js
frontend/src/features/card-generation/GraphProvisioningPanel.js
frontend/src/features/card-generation/ReadinessPanel.js
frontend/src/features/card-generation/PlannerDraftPanel.js
frontend/src/features/card-generation/StageAssessmentPanel.js
frontend/src/features/card-generation/ProgressPanel.js
frontend/src/features/card-generation/generationModel.js
frontend/src/features/card-generation/releasePayloads.js
frontend/src/features/card-generation/generationEvents.js
frontend/src/features/card-generation/AutomationReviewPanels.js
frontend/src/features/card-generation/AutomationSchedulerPanels.js
frontend/src/features/card-generation/CardGenerationFacade.js
```

Responsibilities:

- own the Owner generation workflow UI;
- keep target provisioning, graph options, planner readiness, draft/publish,
  and stage-assessment controls visible and testable;
- keep selected Owner workspace separate from selected learner target.

Current source migration target:

- card-generation sections of `public/growth-card-generation-ui.js`
- Owner target-selection helpers in `public/app.js`

Current ESM implementation:

- `frontend/src/features/card-generation/generationModel.js`
- `frontend/src/features/card-generation/releasePayloads.js`
- `frontend/src/features/card-generation/TargetSelector.js`
- `frontend/src/features/card-generation/ProgressPanel.js`
- `frontend/src/features/card-generation/ReadinessPanel.js`
- `frontend/src/features/card-generation/ActionPanel.js`
- `frontend/src/features/card-generation/CardGenerationPanel.js`
- `frontend/src/features/card-generation/generationEvents.js`
- `frontend/src/features/card-generation/AutomationPanels.js`
- `frontend/src/features/card-generation/AutomationReviewPanels.js`
- `frontend/src/features/card-generation/AutomationSchedulerPanels.js`
- `frontend/src/features/card-generation/CycleDrilldownPanel.js`
- `frontend/src/features/card-generation/OwnerAuditPanel.js`
- `frontend/src/features/card-generation/ReferenceChainPanel.js`
- `frontend/src/features/card-generation/SecondaryReadbacksPanel.js`
- `frontend/src/features/card-generation/LearningLoopStatePanel.js`
- `frontend/src/features/card-generation/ProfilePanel.js`
- `frontend/src/features/card-generation/StageAssessmentPanel.js`
- `frontend/src/features/card-generation/CardGenerationFacade.js`

Covered behavior includes Fanfan sample target detection, Owner generation
workspace preference, target provisioning selection, generation progress
steps, release workbench scope extraction, release artifact/action-audit/status
readback query payloads, release evidence/lifecycle readback payloads, and
summary-only Owner lifecycle record payloads. The first render helpers cover
target rows, context target insertion, target provisioning controls, status
labels, generation progress markup, readiness rows, recipe options, summary
history facts, daily-loop draft/publish/advance blocked-reason rules,
primary-generation next-action gating, action-panel button markup,
secondary readback disclosure grouping, renderer injection boundaries,
reference-chain request selection, summary row rendering, refresh states,
cycle audit/history query payloads, cycle timeline/finding/history rows,
Owner audit metric/plan/profile/correction rows, Owner correction payloads,
completed-cycle Owner review query/write payloads, review rows, action status
panels, and Owner review disabled states,
automation closed-loop action labels/statuses, phase rows, action-plan
readback panel, cycle-closure status/readback panel, and review-advancement
status/readback panel. Automation proposal create payload anchoring, proposal
review rows/panel, digest review rows/panel, failure-policy readiness/review
rows/panel, and action handoff digest/row panels are now split into
`AutomationReviewPanels.js`; scheduler execution handoff and execution
rows/panel, scheduler run rows/panel, and worker-target rows/panel are now
split into `AutomationSchedulerPanels.js`. Both modules are compatibility
re-exported through `AutomationPanels.js`,
learning-loop status/reason mappings, next-action readback markup, active
stage checkpoint open-card markup, profile rows, recommendation lifecycle
rows, next-card recommendation panels, profile feedback rows/panels,
stage-assessment status labels, reason mappings, rubric policy panels,
controls readiness markup, and activation gating, release workbench
status/action/audit/package panels, release artifact template/checklist/
action-plan panels, release status readback rows/panels, release
evidence/approval ledger rows/panels, release lifecycle record rows/panels,
and the pure Owner card-generation shell composition with intro KPIs, target
selection, readiness/provisioning/action sections, injected secondary
readbacks, daily plan preview, generated-card preview, and structured summary
preview. The no-global card-generation façade now aligns the migrated payload
builders and renderer surface with the legacy `HermesGrowthCardGenerationUi`
export shape, including daily-loop, automation, release readback, target
provisioning, stage-assessment, reference-chain, cycle, Owner-audit, and
card-generation panel entry points. The first event descriptor coverage maps
legacy `data-*` controls to stable action descriptors for Owner generation, target provisioning, Owner
audit review, cycle/profile/reference refreshes, release workbench and
lifecycle actions, automation proposal/digest/failure-policy/action-handoff/
scheduler controls, recommendation lifecycle review, and stage assessment
controls without changing active runtime wiring.

### Release And Evidence Feature

```text
frontend/src/features/release/ReleaseWorkbenchView.js
frontend/src/features/release/ReleaseArtifactTemplateView.js
frontend/src/features/release/ReleaseStatusReadbacksView.js
frontend/src/features/release/ReleaseEvidenceLedgerView.js
frontend/src/features/release/ReleaseLifecycleRecordsView.js
frontend/src/features/release/ReleaseReadinessView.js
frontend/src/features/release/ReleaseControlsView.js
frontend/src/features/release/ReleaseInventoryView.js
frontend/src/features/release/ReleaseDashboardView.js
frontend/src/features/release/EvidenceCollectionView.js
frontend/src/features/release/ReleaseEvidencePanel.js
```

Responsibilities:

- separate release/readiness/evidence UI from card-generation UI;
- keep release controls readback-oriented unless an explicit Owner/write gate
  is present;
- preserve summary-only evidence display boundaries.

Current source migration target:

- release and evidence sections of `public/growth-card-generation-ui.js`

Current ESM implementation:

- `frontend/src/features/release/ReleaseWorkbenchView.js` owns pure release
  workbench status labels, supported endpoint checks, action rows, package
  candidate/status rows, action status rows, action audit rows, and the
  composable release workbench panel shell.
- `frontend/src/features/release/ReleaseArtifactTemplateView.js` owns pure
  artifact template status labels, artifact slot rows, evidence checklist
  rows, action-plan rows, template data selection, and the artifact template
  readback panel.
- `frontend/src/features/release/ReleaseControlsView.js`,
  `frontend/src/features/release/ReleaseDashboardView.js`,
  `frontend/src/features/release/ReleaseInventoryView.js`, and
  `frontend/src/features/release/ReleaseReadinessView.js` own the pure release
  controls, dashboard, inventory, review, authorization, closure, preflight,
  activation, and runtime readback selectors/row descriptors.
- `frontend/src/features/release/ReleaseStatusReadbacksView.js` owns the
  composed release status readback status/detail extraction and readback
  refresh panel while delegating the per-readback data selection to those
  release submodules.
- `frontend/src/features/release/EvidenceCollectionView.js` owns pure release
  evidence collection data selection and bounded evidence rows.
- `frontend/src/features/release/ReleaseEvidencePanel.js` owns pure release
  approval ledger data selection and bounded approval rows.
- `frontend/src/features/release/ReleaseEvidenceLedgerView.js` owns release
  evidence/approval status labels, the composed evidence ledger data surface,
  readback counters, and the ledger refresh panel while delegating evidence and
  approval rows to those release evidence submodules.
- `frontend/src/features/release/ReleaseLifecycleRecordsView.js` owns pure
  release lifecycle data selection, preflight/activation/runtime record id and
  detail extraction, bounded record rows, explicit Owner record controls,
  action status readback, and the lifecycle refresh panel.
- The composed panel accepts injected renderers for artifact template,
  status readbacks, evidence ledger, and lifecycle records so those subpanels
  can move into their own release modules without widening the active runtime
  change.

### Card Interaction Feature

```text
frontend/src/features/card-interaction/CardInteractionController.js
frontend/src/features/card-interaction/SubmissionPanel.js
frontend/src/features/card-interaction/AudioRecorderController.js
frontend/src/features/card-interaction/CardInteractionActions.js
frontend/src/features/card-interaction/CardInteractionDomEvents.js
frontend/src/features/card-interaction/ReflectionPanel.js
frontend/src/features/card-interaction/ExperienceSignalPanel.js
frontend/src/features/card-interaction/EvaluationStateView.js
```

Responsibilities:

- preserve learner submission, audio recording, evaluation status, Owner retry,
  reflection, and experience signal behavior;
- keep recording preview failures visible and recoverable;
- avoid reopening one-shot reflection or evaluation flows after terminal states.

Current source migration target:

- `public/growth-card-interaction-controller.js`

Current ESM implementation:

- `frontend/src/features/card-interaction/SubmissionPanel.js` owns pure
  submission/evaluation render helpers for interaction keys, recorder
  statuses, saved-audio evidence, submitted-answer status, feedback lists,
  evaluation job readbacks, failed/waiting/completed evaluation panels, and
  Owner retry action markup.
- `frontend/src/features/card-interaction/ReflectionPanel.js` owns pure
  reflection status/form rendering and reuses the recorder/audio evidence
  helpers without moving controller side effects.
- `frontend/src/features/card-interaction/ExperienceSignalPanel.js` owns pure
  completed-card feedback and difficulty signal markup, including reward
  settlement text, target-node attributes, pending/selected/disabled states,
  and status notes.
- `frontend/src/features/card-interaction/CardInteractionController.js` owns
  the first pure composition entry for quick-check submission forms and the
  combined interaction panel, preserving legacy form, draft, recorder,
  evaluation, reflection, and feedback markup without moving DOM side effects.
- `frontend/src/features/card-interaction/interactionActions.js` owns the
  first pure state/action helpers for card lookup, workspace resolution,
  interaction messages, busy flags, write payload construction, experience
  signal normalization, and detail-cache merge behavior.
- `frontend/src/features/card-interaction/AudioRecorderController.js` owns the
  injected audio recorder lifecycle helpers for MIME preference, playback
  compatibility warnings, recording start/stop/toggle, stream/timer/object URL
  cleanup, playback-error state, and summary audio payload projection.
- `frontend/src/features/card-interaction/CardInteractionActions.js` owns the
  injected legacy-compatible card-interaction controller factory for
  submission, evaluation refresh/retry, reflection, experience signal,
  workspace resolution, write-result merge, recording cleanup, refresh
  callbacks, and message/busy state transitions.
- `frontend/src/features/card-interaction/CardInteractionDomEvents.js` owns
  the first delegated DOM-event helper layer for legacy card-interaction
  `data-*` selectors, draft input state updates, controller method dispatch,
  saved-audio error reveal behavior, async error fallback, and listener
  cleanup.

### Legacy Board Feature

```text
frontend/src/features/legacy-board/LegacyBoardView.js
frontend/src/features/legacy-board/LegacyTaskUi.js
frontend/src/features/legacy-board/LegacyProgramUi.js
frontend/src/features/legacy-board/LegacyCoinsUi.js
frontend/src/features/legacy-board/LegacyGrowthUiFacade.js
```

Responsibilities:

- preserve the current board, program, task, and coin UI behavior during the
  migration;
- keep the `legacy` name until the behavior is fully replaced by stable modern
  views;
- avoid changing product semantics while moving files into ESM modules.

Current source migration targets:

- `public/growth-legacy-ui.js`
- `public/growth-legacy-task-ui.js`
- `public/growth-legacy-program-ui.js`
- `public/growth-legacy-coins-ui.js`

Current ESM implementation:

- `frontend/src/features/legacy-board/LegacyBoardView.js`,
  `LegacyTaskUi.js`, `LegacyProgramUi.js`, and `LegacyCoinsUi.js` provide the
  Phase 5 target ESM façade boundary over the migrated pure view
  implementations. Runtime wiring remains non-active, but follow-up cutover
  code can now import board, task, program, and coin render entries from the
  planned `legacy-board` namespace.
- `frontend/src/features/legacy-board/LegacyGrowthUiFacade.js` provides the
  no-global shell-level composite façade aligned with the legacy
  `HermesLearningGrowthUi` export surface. It adapts the classic
  `renderLearningGrowthView(options)` input shape into the migrated ESM
  Owner workspace, selected-card detail, Owner settings, history, route-notice,
  readiness, capability, tab, board, and keyboard-composer rendering surfaces.
- `frontend/src/views/TeachingCardDetailView.js` owns the first selected-card
  teaching detail slice extracted from `public/growth-legacy-task-ui.js`,
  including card-role normalization, teaching-flow normalization, daily
  submission/evaluation/reflection rail, score-policy summary, lesson and
  guided-practice rendering, share action markup, and composition with the ESM
  card-interaction panel.
- `frontend/src/views/ProgramExecutionView.js` owns the first summary/list
  slice extracted from `public/growth-legacy-program-ui.js`, including program
  and task status copy, focus labels, draft summaries, program cards, task
  rows and simple action buttons, skill chips, evaluation rows, daily-plan
  panel, and execution overview composition. It also owns the first native
  Growth submission/reflection form slice, including structured question
  normalization, previous structured response rehydration, submission guard and
  requirement labels, audio-required task detection, recorder status/control
  markup, revision collapse, spoken-reflection form markup, and record-derived
  next-action selection. It now also owns the selected-card native Growth
  detail renderer for reward policy, sequence decisions, reading material,
  previous submission history, audio-evidence history, recent feedback head,
  feedback detail, task instruction collapse, Owner manual-pass menu, share and
  return actions, and `CardDetailView` route selection for non-teaching native
  Growth tasks. The module now also owns parent/admin program panel helpers for
  review queues, parent review requests, reward settlements, launch operation
  queues, parent weekly report, and parent-admin composition. Source/goal setup
  forms are also covered in ESM, including source create, goal create,
  foundation import, source-directory import and bootstrap controls, foundation
  learner facts, and program scope defaults. The source/goal and foundation
  helpers now live in `frontend/src/views/ProgramFoundationView.js`;
  `ProgramExecutionView.js` re-exports that surface to preserve existing
  imports while the oversized program view is split incrementally. The Owner
  program form, launch-operation readbacks, review queues, parent weekly
  report, reward settlement list, and parent-admin composition now live in
  `frontend/src/views/ProgramParentAdminView.js`, with compatibility
  re-exports from `ProgramExecutionView.js`. Native Growth submission/reflection
  forms, audio/readback history, reward policy, feedback details, reading
  material, selected-card detail shell, and native Growth detail detection now
  live in `frontend/src/views/ProgramNativeGrowthDetailView.js`, also with
  compatibility re-exports from `ProgramExecutionView.js`. Native Growth
  submission/reflection forms, structured question rendering, recorder
  controls, and next-action calculation now live in
  `frontend/src/views/ProgramNativeGrowthSubmissionView.js`, with compatibility
  re-exports through `ProgramNativeGrowthDetailView.js` and
  `ProgramExecutionView.js`.
  `ProgramExecutionView.js` is 387 lines after these cuts and now serves as the
  program overview/subsystem compatibility surface before final runtime cutover
  wiring.
- Focused tests prove the `legacy-board` façade renders the current legacy
  `data-*` markers for board cards/lanes, teaching and native Growth task
  details, program cards/subsystem, coin reward pages, and shell-level
  `renderLearningGrowthView` composition.

### Utilities

```text
frontend/src/utils/arrays.js
frontend/src/utils/dates.js
frontend/src/utils/dom.js
frontend/src/utils/escapeHtml.js
frontend/src/utils/numbers.js
frontend/src/utils/privacy.js
frontend/src/utils/strings.js
```

Responsibilities:

- hold small pure helpers such as `clean`, `asArray`, bounded text, escaping,
  DOM query helpers, and number/date normalization;
- avoid feature-specific business logic.

## Current File Migration Map

| Current file | Target ESM area |
| --- | --- |
| `public/app.js` | `frontend/src/main.js`, `frontend/src/app/*`, `frontend/src/views/*` |
| `public/growth-api-client.js` | `frontend/src/api/*`, `frontend/src/platform/proxyUrl.js` |
| `public/growth-appearance.js` | `frontend/src/platform/themeBridge.js`, `frontend/src/platform/viewportBridge.js` |
| `public/growth-route-controller.js` | `frontend/src/routing/*` |
| `public/growth-view-model.js` | `frontend/src/state/viewModel.js`, `frontend/src/state/selectors.js`, `frontend/src/views/*` |
| `public/growth-card-generation-ui.js` | `frontend/src/features/card-generation/*`, `frontend/src/features/release/*` |
| `public/growth-card-interaction-controller.js` | `frontend/src/features/card-interaction/*` |
| `public/growth-navigation-controller.js` | `frontend/src/app/domEvents.js`, `frontend/src/routing/*` |
| `public/growth-legacy-ui.js` | `frontend/src/features/legacy-board/LegacyBoardView.js` |
| `public/growth-legacy-task-ui.js` | `frontend/src/features/legacy-board/LegacyTaskUi.js` |
| `public/growth-legacy-program-ui.js` | `frontend/src/features/legacy-board/LegacyProgramUi.js`, `frontend/src/views/ProgramExecutionView.js`, `frontend/src/views/ProgramFoundationView.js`, `frontend/src/views/ProgramParentAdminView.js`, `frontend/src/views/ProgramNativeGrowthDetailView.js`, `frontend/src/views/ProgramNativeGrowthSubmissionView.js` |
| `public/growth-legacy-coins-ui.js` | `frontend/src/features/legacy-board/LegacyCoinsUi.js` |

## Next Non-Runtime Migration Slices

These slices are the preferred order after the view-model ESM surface. They
must remain non-runtime parity work until Owner cutover approval, central
mobile visual evidence, deploy-lane routing, and runtime-boundary readback are
available.

Completed slice - API client ESM parity:
   - Legacy source: `public/growth-api-client.js`.
   - Target ESM area: `frontend/src/api/growthApiClient.js`,
     `frontend/src/api/queryParams.js`, `frontend/src/api/request.js`, and
     `frontend/src/platform/proxyUrl.js`.
   - Scope completed: complete query builders, request options, direct/proxy workspace
     query rules, release/automation/card endpoint wrappers, and launch-token
     header shaping without replacing `window.HermesGrowthApiClient` in
     `public/app.js`.
   - Gates: ESM tests for API parity, cutover-readiness evidence
     `api_client_esm_surface_present`, and `npm run check:frontend`.

Completed slice - card-generation global surface façade:
   - Legacy source: `public/growth-card-generation-ui.js`.
   - Target ESM area: `frontend/src/features/card-generation/*` and
     `frontend/src/features/release/*`, with
     `frontend/src/features/card-generation/CardGenerationFacade.js` as the
     no-global façade.
   - Scope completed: composed existing payload builders, release builders,
     cycle/audit/profile/reference helpers, and panel renderers into an ESM
     surface aligned with `HermesGrowthCardGenerationUi` while keeping legacy
     DOM event flow inactive.
   - Gates: ESM tests for façade exports, representative payload builders, and
     `renderOwnerCardGenerationPanel`; cutover-readiness evidence
     `card_generation_esm_facade_present`.

Completed slice - legacy Growth UI composite façade:
   - Legacy sources: `public/growth-legacy-ui.js`,
     `public/growth-legacy-task-ui.js`, `public/growth-legacy-program-ui.js`,
     and `public/growth-legacy-coins-ui.js`.
   - Target ESM area: existing `frontend/src/features/legacy-board/Legacy*.js`,
     plus `frontend/src/features/legacy-board/LegacyGrowthUiFacade.js`.
   - Scope completed: wired already migrated board, task, program, coins,
     Owner workspace, selected-card detail, settings, route-notice, history,
     readiness, capability, tab, and keyboard-composer surfaces into the
     shell-level legacy Growth UI entry without changing `public/index.html`
     or runtime opt-in.
   - Gates: ESM tests for façade export parity, Owner/executor board
     composition, route notice, selected-task detail, history, Owner settings,
     and helper renderers; cutover-readiness evidence
     `legacy_growth_ui_composite_present`.

Do not take `public/app.js` orchestration as the next broad slice. It crosses
API, navigation, routing, view model, card interaction, and generation dispatch
at the same time. With the smaller parity surfaces above covered, keep
`public/app.js` replacement for the final runtime adapter/cutover wiring after
Owner approval, deploy-lane routing, and runtime-boundary readback are
available. Central mobile visual evidence has already been accepted for this
cutover packet.

## Compatibility Adapter

During migration only, keep:

```text
frontend/src/legacy/registerGlobals.js
```

This adapter may expose existing `window.Growth*` registration points so old
static modules and new ESM modules can coexist during phased work. It must be
treated as temporary compatibility glue. Each migrated module should remove one
global dependency, and the final phase must delete this adapter.

## Vite Configuration

Add a root Vite config:

```text
vite.config.js
```

Baseline configuration:

```js
import { defineConfig } from "vite";

export default defineConfig({
  root: "frontend",
  build: {
    outDir: "../public/assets/growth",
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      input: "frontend/src/main.js",
      output: {
        entryFileNames: "growth.[hash].js",
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: "assets/[name].[hash][extname]"
      }
    }
  }
});
```

If Vite resolves `rollupOptions.input` relative to `root`, use
`src/main.js` instead. The first implementation slice must prove the selected
configuration with an actual build.

## Package Scripts

Add scripts in phases:

```json
{
  "build:frontend": "vite build",
  "dev:frontend": "vite --host 127.0.0.1",
  "smoke:frontend-dev": "node scripts/smoke-growth-vite-dev-server.js",
  "test:frontend": "node --test tests/growth-vite-assets.test.js tests/growth-frontend-esm-modules.test.mjs",
  "check:frontend": "node scripts/check-growth-frontend-esm-syntax.js && npm run --silent build:frontend && node scripts/check-growth-vite-assets.js && node scripts/check-growth-vite-runtime-boundary.js && node scripts/check-growth-vite-cutover-readiness.js && node scripts/check-growth-vite-owner-cutover-preflight.js && node scripts/check-growth-vite-phase-audit.js && npm run --silent smoke:frontend-dev && npm run --silent test:frontend"
}
```

`npm run check` must eventually include:

- Vite config syntax;
- frontend ESM source syntax;
- Vite build;
- asset manifest validation;
- pre-Owner runtime boundary validation;
- Owner cutover preflight validation that reports accepted central visual
  evidence and missing external Owner/deploy-lane evidence without enabling
  runtime;
- phase audit validation that reports Phase 0-6 internal readiness and Phase 7
  external evidence blockers without enabling runtime;
- Vite dev-server smoke validation;
- existing runtime JavaScript coverage.

The first Vite slice should add `scripts/check-growth-vite-assets.js` to
verify:

- the manifest exists;
- the entry asset exists under `public/assets/growth`;
- no stale hardcoded asset path is referenced by `public/index.html`;
- built asset references are relative/proxy-safe;
- no raw secrets or local private paths are emitted into the manifest.

## Testing Plan

Keep existing high-value integration tests during migration:

- `tests/growth-frontend-adapter.test.js`
- `tests/growth-embedded-layout.test.js`
- `tests/growth-architecture-boundary.test.js`
- route and service tests that prove Home AI proxy/workspace behavior

Add ESM-focused frontend tests:

```text
tests/frontend/api-client.test.js
tests/frontend/route-controller.test.js
tests/frontend/generation-model.test.js
tests/frontend/generation-render.test.js
tests/frontend/card-interaction.test.js
tests/frontend/viewport-bridge.test.js
tests/frontend/release-panels.test.js
```

Over time, move brittle large VM assertions into smaller module tests while
retaining a compact end-to-end adapter test for embedded boot and core user
flows.

## Implementation Phases

### Phase 0: Baseline And Gates

- Run AI Operations intake for the concrete implementation task.
- Read this plan, `docs/HOME_AI_PLATFORM_CONTRACT.md`, and the central
  plugin workspace contract.
- Record current test and check baseline.
- Do not change product behavior in this phase.

Definition of done:

- baseline validation results are recorded in handoff;
- no source behavior changed.

### Phase 1: Vite Skeleton

- Add `vite.config.js`.
- Add `frontend/index.html`.
- Add `frontend/src/main.js` with a minimal no-op or parity bootstrap.
- Add `build:frontend`, `test:frontend`, and `check:frontend` scripts.
- Add asset manifest validation.
- Keep `public/index.html` behavior unchanged or load the Vite bundle behind a
  no-op compatibility bootstrap.

Definition of done:

- Vite build passes;
- existing `npm test` and `npm run check` pass;
- `public/index.html` still works under the Home AI embedded plugin path.

Current status:

- Implemented including `dev:frontend` and automated dev-server smoke coverage.
  Development validation uses `build:frontend`, `smoke:frontend-dev`,
  `check:frontend`, and focused frontend tests.
- `public/index.html` still loads the legacy scripts and only attempts to load
  the Vite ESM entry through the no-op-safe loader when generated assets exist.
  The active runtime remains legacy until Owner approval, deploy-lane routing,
  and runtime opt-in are complete. Central mobile visual evidence has already
  been accepted for this cutover packet.

### Phase 2: Platform, API, And Routing ESM

- Migrate API client, embedded context, proxy URL construction, theme/viewport
  bridge, and route controller into ESM modules.
- Keep compatibility globals only as needed.
- Add module tests for API routing, bounded errors, host action routing, and
  viewport message handling.

Definition of done:

- direct and same-origin proxy API behavior is unchanged;
- host manifest actions still land on the correct in-app route;
- keyboard/viewport bridge behavior remains compatible with visual Harness
  expectations.

Current status:

- Implemented in parallel ESM modules with focused tests in
  `tests/growth-frontend-esm-modules.test.mjs`.
- Theme and viewport responsibilities are split into
  `frontend/src/platform/themeBridge.js` and
  `frontend/src/platform/viewportBridge.js`, with `appearance.js` retained as a
  compatibility aggregation entry.
- Visible UI behavior is unchanged; `public/app.js`,
  `public/growth-api-client.js`, `public/growth-appearance.js`, and
  `public/growth-route-controller.js` remain the active runtime wiring.

### Phase 3: Owner Card Generation And Release UI

- Split `public/growth-card-generation-ui.js` into card-generation and release
  feature modules.
- Keep card generation target selection, target provisioning, planner context,
  draft/publish, stage-assessment, release evidence, and release workbench
  behavior unchanged.
- Add focused ESM tests for generation model, render output, target
  provisioning, and release panels.

Definition of done:

- Owner generation tests pass;
- existing frontend adapter tests pass;
- no regression in Owner workspace versus selected learner target behavior.

Current status:

- Partially implemented at the pure model/payload layer plus the first
  target/progress/readiness/profile render helpers, profile feedback render
  helpers, daily-loop action gating and action-panel render helpers,
  reference-chain request/readback render helpers, cycle drilldown/history
  request and readback render helpers, secondary readback disclosure
  composition with injectable renderers,
  learning-loop state status/reason/next-action render helpers,
  stage-assessment status/reason/rubric/control render helpers, pure Owner
  card-generation shell composition, event descriptor mapping for legacy
  `data-*` controls, app-shell DOM delegation adapter skeleton, action
  dispatcher mapping to injected controller handlers, pure app-controller
  state/failure handling, cycle-history selection cascade orchestration,
  dispatcher-level descriptor adapters for legacy writeful handler button
  arguments, injected readback action handlers for release/profile refreshes,
  injected release write handlers for workbench actions, package builds, and
  lifecycle records, injected automation/recommendation write handlers and
  payload helpers for proposal create/review/publish, digest create/review,
  failure-policy create/review, handoff create/deliver, scheduler execution/run,
  scheduler-worker create/review, operating-loop advance, cycle-closure
  preparation, review advancement, closed-loop action-plan runner delegation,
  non-active runtime adapter wiring for handler factory/controller/DOM events,
  release workbench
  status/action/audit/package render helpers, release artifact template render
  helpers, and release status readback, evidence ledger, and lifecycle record
  render helpers. Active runtime wiring still remains in legacy scripts.
- Focused coverage lives in `tests/growth-frontend-esm-modules.test.mjs`.

### Phase 4: Card Interaction

- Migrate submission, audio recording, evaluation state, reflection, experience
  signals, and Owner retry UI into feature modules.
- Preserve one-shot evaluation/reflection state and recoverable recording
  preview failure states.

Definition of done:

- card interaction module tests pass;
- existing generated-card flow tests pass;
- audio MIME and playback preview behavior is unchanged.

### Phase 5: Legacy Board UI

- Move legacy board/program/task/coin modules into ESM while preserving current
  behavior.
- Keep the `legacy-board` feature name until a separate product redesign
  replaces it.

Definition of done:

- board, lane, rewards, and program tests pass;
- embedded scrolling and mobile layout tests pass.

Current status:

- The Phase 5 `frontend/src/features/legacy-board/*` namespace exists as an
  ESM façade over the migrated pure view implementations for board, task,
  program, and coins UI.
- Focused tests prove board, lane, rewards, and program façade behavior.
- Active runtime wiring still remains in legacy scripts until final cutover.

### Phase 6: Remove Static Compatibility Globals

- Delete temporary `frontend/src/legacy/registerGlobals.js`.
- Stop loading migrated static public modules directly.
- Ensure all frontend behavior enters through Vite ESM bootstrap.

Definition of done:

- no stale `window.Growth*` compatibility requirement remains;
- `public/index.html` loads only the intended Vite entry and required static
  CSS/assets;
- before Owner cutover approval, `node scripts/check-growth-vite-runtime-boundary.js`
  proves `public/index.html` still keeps the legacy classic-script runtime
  active, keeps the Vite bootstrap loader last, and does not enable the Vite
  runtime;
- `node scripts/check-growth-vite-cutover-readiness.js` passes with
  `readyForRuntimeEnablement=true`, including runtime adapter, program ESM
  surface, theme/viewport bridge ESM surfaces, host route/navigation controller
  ESM surfaces, `legacy-board` façade, `legacy_growth_ui_composite_present`,
  and migration-plan boundary evidence;
- `node scripts/check-growth-vite-owner-cutover-preflight.js` passes in advisory
  mode. Before Owner approval it reported `readyForOwnerCutover=false`,
  `configChangeApplied=false`, and `runtimeConfigChange=false`; after Owner
  approval it reports `readyForOwnerCutover=true`, `configChangeApplied=true`,
  `runtimeConfigChange=true`, accepted central mobile visual evidence, accepted
  deploy-lane routing, and no missing external evidence;
- `node scripts/check-growth-vite-phase-audit.js` passes with
  `internalReadyForOwnerEvidence=true`, `readyForRuntimeEnablement=true`,
  Phase 0-6 internal evidence complete, and Phase 7 external evidence complete
  after Home AI Deploy returned bounded production readback;
- existing full test/check suite passes.

### Phase 7: Visual And Production Readiness Evidence

- Run Home AI embedded visual Harness where required by the concrete UI change.
- For general shell changes, run `embedded-plugin-shell --plugin-id growth`.
- For keyboard/composer or input layout changes, run
  `embedded-plugin-keyboard-composer --plugin-id growth`.
- Use the central Home AI visual lane and Appium tooling only.

Definition of done:

- bounded visual evidence is recorded;
- central mobile visual evidence is accepted for Owner cutover readiness;
- if production deployment is needed, a request-shaped deploy card is sent to
  the Home AI deploy lane pool with source commit, deploy reason, restart
  label, health URL, and bounded readback expectations.

## Validation Matrix

Minimum local validation for each implementation slice:

```bash
npm run --silent check
npm test -- --test-reporter=spec
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
node /Users/hermes-dev/HermesMobileDev/app/scripts/plugin-workspace-platform-contract-check.js --plugin growth --json
git diff --check
```

Additional validation when Vite files are touched:

```bash
npm run build:frontend
npm run smoke:frontend-dev
npm run test:frontend
npm run check:frontend
node scripts/check-growth-vite-cutover-readiness.js
node scripts/check-growth-vite-owner-cutover-preflight.js
node scripts/check-growth-vite-phase-audit.js
```

Additional validation when embedded layout, keyboard, shell, or host action
behavior changes:

```bash
cd /Users/hermes-dev/HermesMobileDev/app
npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/ --json
```

Keyboard/composer changes also require:

```bash
cd /Users/hermes-dev/HermesMobileDev/app
npm run ios:pwa:visual -- --scenario embedded-plugin-keyboard-composer --plugin-id growth --debug-url http://127.0.0.1:19073/ --json
```

## Non-Goals

- Do not migrate backend CommonJS modules to ESM as part of the frontend Vite
  work.
- Do not replace Growth service, route, store, MCP, Gateway, scheduler, release,
  or deployment boundaries.
- Do not introduce a separate plugin-local Appium, Simulator, visual Harness,
  deployment, or production access workflow.
- Do not replace Home AI same-origin proxy behavior with direct public or LAN
  plugin URLs.
- Do not use this migration to alter card-generation, evaluation, release, or
  scheduler product semantics unless a separate requirements document says so.

## Risks And Controls

| Risk | Control |
| --- | --- |
| Static asset cache or stale hash loads old UI | manifest validation, client-version/hash update, embedded shell smoke |
| Same-origin proxy behavior changes | API client module tests and Home AI proxy smoke |
| Owner generation behavior regresses during split | migrate first behind focused generation model/render tests |
| Visual keyboard layout regresses | central `embedded-plugin-keyboard-composer` Harness |
| Compatibility globals become permanent | track and remove one global dependency per phase; Phase 6 deletes adapter |
| Large VM tests mask module defects | add small ESM module tests before shrinking integration tests |
| Vite build emits private paths or unsafe metadata | asset checker scans manifest/output for private path and secret-looking values |

## Quality Targets

- New frontend modules should normally stay under 400 lines.
- Feature modules over 600 lines need a split plan before more behavior is
  added.
- Views should not perform direct fetch calls.
- API modules should not mutate DOM.
- Platform bridge modules should not own Growth product rules.
- Tests should prefer pure model/render/module coverage, with a small number of
  adapter tests for embedded integration.
