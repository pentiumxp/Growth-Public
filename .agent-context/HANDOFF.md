# HANDOFF

## Home AI Platform Contract Pointer

- Home AI platform contract version: `20260611-v3`.
- Local pointer: `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Canonical Home AI docs live under:
  `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/`.
- Do not record raw secrets, access keys, workspace keys, launch tokens, or
  private payloads in this handoff.

## 2026-06-14 Growth Profile-Driven Next Target Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added `learning-card-next-target-service` as the Service First boundary for
    default next-card target selection;
  - wired card generation and card generation context to share the same
    next-target service, so Owner preview and actual generation use the same
    selected target;
  - when Owner does not hand-pick a target for an ordinary daily card, Growth
    now selects the next graph node from the learner's summary-only profile and
    next-card strategy before falling back to bounded graph suggestions;
  - explicit `targetNodeId` remains authoritative and validated before use;
  - formal stage assessment generation still requires explicit target coverage
    and does not auto-select a default target;
  - kept the model boundary unchanged: Growth still calls Gateway through the
    authoring client/adapter and does not call provider APIs directly.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-card-next-target-service.test.js`;
  - `tests/learning-card-generation-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - `npm run check`;
  - `npm test` with 209 passing tests;
  - focused AI card loop gate:
    `node --test tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js tests/growth-architecture-boundary.test.js`
    with 44 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - app AI Ops intake classified the task as H1 Gateway Runtime because the
    card loop crosses the Gateway model boundary; required app checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`;
  - app architecture harness:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in both Growth plugin and Home AI app workspaces;
  - CodeGraph status after edits: 119 files, 1238 nodes, 4302 edges.
- AI Ops:
  - evidence id: `evidence-bdf3868b-23c2-4b05-a2e9-f3282d89ff1b`;
  - deployment was not required by the intake packet for this slice.
- Remaining architecture work:
  - add a higher-level generation recipe/policy service so Owner can request
    "daily English" without knowing graph/domain parameters;
  - close the loop from evaluation/profile deltas into queued next-card
    recommendations instead of only selecting at generation time;
  - add Owner-visible next-card rationale history once more than one learner is
    enabled.

## 2026-06-14 Growth Owner Evaluation Job Status UI Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - extended `latestEvaluationJob` projection with bounded
    `lastOwnerReview` summary fields from job `raw_json`;
  - updated failed/waiting evaluation panels to show bounded job status:
    attempt count, due retry time, processing lease time, and latest Owner
    retry timestamp;
  - kept `lastError` display Owner-only and bounded; learner views do not
    expose Gateway/provider error details;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-owner-evaluation-status-ui-v1`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-learning-sqlite-projection.test.js`;
  - `tests/growth-frontend-adapter.test.js`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-learning-sqlite-projection.test.js tests/growth-frontend-adapter.test.js tests/growth-learning-sqlite-store.test.js`
    with 46 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - local Playwright mobile/dark smoke against `http://127.0.0.1:4895/`:
    13 static assets used `20260614-owner-evaluation-status-ui-v1`, old retry
    UI keys were absent, Owner retry button remained visible, and job status /
    Owner-only error text rendered;
  - `npm test` with 204 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 117 files, 1220 nodes, 4247 edges.
- Browser/tooling:
  - Codex in-app Browser was unavailable (`iab` not connected), so local visual
    validation used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-40380118-b8e5-465a-b32f-b6459e8f526c`.
- Remaining architecture work:
  - consider an Owner-wide evaluation recovery queue instead of only per-card
    actions once there is more than one active learner;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Owner Evaluation Retry UI Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added an Owner-only `重新批改` action to the generated-card failed
    evaluation panel rendered by `public/growth-legacy-task-ui.js`;
  - wired `public/app.js` to dispatch that action through
    `growth-card-interaction-controller`;
  - added `retryEvaluation` in `public/growth-card-interaction-controller.js`;
    it calls `retryGrowthEvaluation`, then requests one evaluation process
    refresh and reloads the card detail;
  - kept non-Owner learners on the visible recovery/read-only state with
    `刷新状态` only;
  - added mobile-safe action wrapping/gap and secondary button contrast in
    `public/growth-homeai-legacy.css`;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-owner-evaluation-retry-ui-v1`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-architecture-boundary.test.js tests/growth-routes.test.js tests/learning-evaluation-owner-review-service.test.js`
    with 59 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - local Playwright mobile/dark smoke against `http://127.0.0.1:4895/`:
    13 static assets used `20260614-owner-evaluation-retry-ui-v1`, old cache
    keys were absent, the failed-evaluation panel rendered, and Owner
    `重新批改` was visible/enabled with `data-workspace-id=weixin_fanfan`;
  - `npm test` with 204 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 117 files, 1220 nodes, 4248 edges.
- Browser/tooling:
  - Codex in-app Browser was unavailable (`iab` not connected), so local visual
    validation used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-2d36a31f-a00f-443a-a7ec-05e383a25f5d`.
- Remaining architecture work:
  - expose queue retry timing/status or retry history in Owner views if failed
    evaluations become common;
  - consider an Owner-wide evaluation recovery queue instead of only per-card
    action once there is more than one active learner;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Owner Evaluation Retry Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added `learning-evaluation-owner-review-service` as the Service First
    Owner recovery boundary for terminal failed evaluation jobs;
  - added `POST /api/v1/growth/evaluations/owner-review`, Owner-only role
    enforcement, view-target scoping, and workspace bearer authorization;
  - added SQLite evaluation-job repository retry support that only accepts
    terminal `failed` jobs, moves them back to `retry`, clears stale lease/error
    fields, and writes bounded `raw.ownerReviews` / `raw.lastOwnerReview`
    audit metadata;
  - kept the learner card contract unchanged: one saved submission, one
    evaluation outcome, one optional reflection, no retry-until-pass loop, and
    no direct Gateway calls from the browser or Owner review route;
  - added `retryGrowthEvaluation` to the frontend API client for Owner surfaces
    and bumped static Growth assets to
    `20260614-owner-evaluation-retry-v1`.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-evaluation-owner-review-service.test.js`;
  - `tests/growth-learning-sqlite-evaluation-jobs.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `tests/growth-frontend-adapter.test.js`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/learning-evaluation-owner-review-service.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js tests/growth-frontend-adapter.test.js`
    with 74 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm test` with 202 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 117 files, 1219 nodes, 4280 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-ac01e0d2-1ab5-4653-bb4c-afcd680e16cd`.
- Remaining architecture work:
  - Owner UI button/panel work is completed in the following UI slice above;
  - expose queue retry timing/status in card detail if delayed retries become
    common in production;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Visible Evaluation Failure Slice

- Current workspace state: implemented, locally validated, committed and
  pushed as part of the current rollout; not deployed.
- Scope:
  - added bounded `latestEvaluationJob` projection in
    `src/stores/growth-learning-sqlite/projection.js`;
  - added `evaluation_failed` lane/action and `primaryAction=owner_review`
    for daily cards whose evaluation job reaches terminal `failed` without a
    persisted evaluation row;
  - kept one-submission/one-evaluation policy intact: failed evaluation jobs do
    not reopen learner submission and do not create a retry-until-pass flow;
  - updated generated-card detail UI to show `批改未完成`, `需要处理`, Owner
    review guidance, and a visible `刷新状态` action instead of hidden
    `等待批改`;
  - added light/dark/system-dark CSS for the failed evaluation panel;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-evaluation-failure-ui-v1`.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-learning-sqlite-projection.test.js`;
  - `tests/growth-learning-sqlite-store.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`.
- Validation passed:
  - `node --test tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-store.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js`
    with 49 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 197 passing tests;
  - app AI Ops H3 required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - dev-port Chrome smoke against `http://127.0.0.1:4892/` using the current
    workspace server and system Chrome: 13 static assets used
    `20260614-evaluation-failure-ui-v1`, old cache keys were absent, the
    failed evaluation panel scrolled into view, the `刷新状态` button was
    enabled, and dark failed-panel colors were applied;
  - `git diff --check`;
  - CodeGraph status after edits: 115 files, 1208 nodes, 4228 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-f899c712-6e95-4b4a-a14e-ffa9d7e3ce2a`.
- Remaining architecture work:
  - implement an explicit Owner review/repair action route if Owner needs to
    manually retry or mark an evaluation failure resolved;
  - expose queue retry timing/status in card detail if delayed retries become
    common in production;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Evaluation Queue Recovery Harness Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `732fe04`
  (`Add Growth evaluation queue recovery harness`); not deployed.
- Scope:
  - confirmed the existing evaluation queue implementation already protects
    active `processing` leases and allows expired `processing` leases to be
    reclaimed by the next worker through `claimEvaluationJob`;
  - added repository-level harness coverage so active leases are not stolen and
    stale processing jobs are reclaimed with a new lease owner and incremented
    attempt count;
  - added SQLite store/service workflow harness coverage so a simulated worker
    restart leaves the active lease untouched, then resumes the stale job after
    `leaseUntil`, completes the card, clears lease fields, and settles Growth
    rewards exactly once;
  - no runtime service code was changed in this slice because the current
    implementation already satisfied the recovery contract.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-learning-sqlite-evaluation-jobs.test.js`;
  - `tests/growth-learning-sqlite-store.test.js`.
- Validation passed:
  - `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js`
    with 15 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 194 passing tests;
  - app AI Ops H3 required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - `git diff --check`;
  - CodeGraph status after edits: 115 files, 1207 nodes, 4223 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-b8e02b3b-831c-4cbf-8337-be38b27c5822`.
- Remaining architecture work:
  - add explicit visible-failure/Owner-review projection for jobs that exhaust
    retries, so learners are not left with a hidden failed evaluation state;
  - consider a small queue wake-up/status endpoint if Owner needs to see
    delayed retry timing in the generation or card-detail UI;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Stage Assessment Owner UI Slice

- Current workspace state: implemented, locally validated, committed and
  pushed as part of the current rollout; not deployed.
- Scope:
  - added Owner `阶段测评` controls to the Growth `生成` tab, rendered below
    the bounded `学习画像` panel;
  - added frontend API helpers for
    `POST /api/v1/growth/stage-assessments/eligibility` and
    `POST /api/v1/growth/stage-assessments/activate`;
  - wired `public/app.js` so Owner can check eligibility, activate a formal
    stage-assessment card, see progress/error/result state, refresh the board,
    and open the published formal card from the generation surface;
  - kept the UI policy-thin: readiness, cooldown, manual activation, and
    generation state remain owned by `learning-stage-assessment-service`;
  - added dark-mode/mobile CSS for the stage-assessment panel and action row;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-stage-assessment-ui-v1` so mobile WebViews do not reuse the old
    card-generation UI bundle.
- Documentation updated:
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-frontend-adapter.test.js` covers stage-assessment API helper
    routes, Owner panel rendering, activation result rendering, and the static
    asset-version guard;
  - `tests/growth-embedded-layout.test.js` covers mobile and dark-mode layout
    selectors for the stage-assessment panel.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js`
    with 31 passing tests;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 192 passing tests;
  - `git diff --check`;
  - dev-port Chrome smoke against `http://127.0.0.1:4891/` using the current
    workspace server and system Chrome: stage-assessment renderer exported,
    13 static assets used `20260614-stage-assessment-ui-v1`, root scroller was
    scrollable (`844` client height, `2513` scroll height), the activation
    button scrolled into view and remained enabled, and dark panel colors were
    applied;
  - app AI Ops H3 required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - CodeGraph status after edits: 115 files, 1207 nodes, 4221 edges.
- AI Ops:
  - correct UI-only intake classified this slice as H3 Architecture
    Documentation And Harness Map, with no deployment or visual lane required;
  - evidence id: `evidence-279e2ce0-86d4-4a53-90bd-557048ed7d18`;
  - a separate trial intake containing the word `closure` classified as Mac
    production deployment H1; that was not used because this rollout is
    commit/push only, not deployment.
- Remaining architecture work:
  - add workflow recovery harnesses for listener restart/stale evaluation
    leases before scaling generated cards;
  - add learner-visible challenge/assessment-entry UI if learner-initiated
    stage challenge is needed;
  - run the central Home AI embedded iOS visual harness and production smoke
    before any production deployment or publish.

## 2026-06-14 Growth Stage Assessment Activation Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `01b6a18`
  (`Add Growth stage assessment activation service`); not deployed.
- Scope:
  - added `stage-assessment-cycles` as the SQLite repository for
    `learning_growth_stage_assessment_cycles`, including imported-schema
    compatibility for `learner_workspace_id`;
  - added `learning-stage-assessment-service` for system eligibility, Owner
    manual activation, learner `executor_challenge`, cooldown policy, and the
    handoff to `learning-card-generation-service`;
  - added `POST /api/v1/growth/stage-assessments/eligibility`,
    `POST /api/v1/growth/stage-assessments/activate`, and
    `POST /api/v1/growth/stage-assessments/challenge`;
  - wired the service in `src/app/services.js` and kept route logic limited to
    JSON parsing, workspace authorization, Owner role checks, and own-workspace
    challenge checks;
  - extended card generation/authoring/publisher metadata so activated
    `stage_assessment` cards persist `stageAssessmentCycleId`, activation
    state/reason/source, cooldown metadata, formal-assessment completion
    metadata, default `300` coin reward metadata, and mastery evidence weight
    `1`;
  - updated `npm run check` to include the new service/repository files.
- Product boundary:
  - ordinary generated cards still use `daily_score_once`: one evaluation, one
    optional reflection, completion after the first evaluation, and
    score-proportional rewards without a pass-line gate;
  - dormant/eligible stage-assessment cycles are not daily homework debt;
  - Owner manual activation records `owner_manual` and may override cooldown;
  - learner challenge activation records `executor_challenge`, can only target
    the executor's own workspace, and respects cooldown;
  - this slice adds backend/service/API readiness only. Broad Owner UI controls
    and production visual evidence remain future work.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-stage-assessment-service.test.js`;
  - `tests/learning-stage-assessment-cycles-repository.test.js`;
  - `tests/learning-card-generation-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `tests/growth-card-authoring-boundary.test.js`;
  - `tests/growth-docs-locality.test.js`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- Validation passed:
  - `node --test tests/learning-stage-assessment-service.test.js tests/learning-stage-assessment-cycles-repository.test.js`;
  - `node --test tests/learning-card-generation-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/learning-stage-assessment-service.test.js tests/learning-stage-assessment-cycles-repository.test.js tests/learning-card-generation-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js tests/growth-card-authoring-boundary.test.js tests/growth-docs-locality.test.js`;
  - app AI Ops required checks from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - `npm run check`;
  - `npm test` with 191 passing tests;
  - `git diff --check`;
  - CodeGraph sync/status after edits: 115 files, 1198 nodes, 4124 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require visual lane or deployment;
  - evidence id: `evidence-2607331a-fda6-4d43-b6d7-08b1b12f39d5`.
- Remaining architecture work:
  - expose stage-assessment eligibility/activation controls in the Owner UI;
  - add a broader workflow recovery harness for listener restart/stale
    evaluation leases before scaling generated cards beyond the initial sample;
  - run central visual evidence and production smoke before any deployment.

## 2026-06-14 Growth Gateway Evaluation Boundary Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `d18d425`
  (`Add Growth AI card loop evaluation boundary`); not deployed.
- Scope:
  - added `growth-gateway-evaluation-client` as the Growth-owned Gateway-only
    model client for card evaluation;
  - added `learning-card-evaluation-service` to assemble bounded authenticated
    evaluation input, call Gateway, parse an evaluation draft, validate schema,
    graph binding, daily-card policy, and privacy, then return the evaluator
    DTO consumed by `growth-evaluation-service`;
  - added `GROWTH_GATEWAY_EVALUATION_*` config fields in `src/config/env.js`;
  - wired `src/app/services.js` so Gateway evaluation is injected only when
    `GROWTH_GATEWAY_EVALUATION_ENDPOINT` is configured. Without that endpoint,
    the existing deterministic evaluator remains the local fallback;
  - extended the card authoring/model boundary guard so it also checks the
    evaluation model boundary and direct-vendor-call exclusions.
- Product boundary:
  - generated daily cards still use `daily_score_once`: one evaluation, one
    optional reflection, completion after the first evaluation, and
    score-proportional reward without pass-line retry;
  - Gateway evaluation output is not persisted directly. It is an evaluation
    draft until validation accepts `growth.card.evaluation.v1`,
    `skillResults` graph binding, daily-card policy, and privacy scans.
- Harness added/updated:
  - `tests/learning-card-evaluation-service.test.js` covers fake Gateway SSE,
    ordinary JSON, official Responses endpoint body, repair prompt body,
    invalid JSON, missing schema fields, privacy-risk output, timeout, and
    evaluator throw behavior for queue retry;
  - `tests/growth-evaluation-service.test.js` now asserts injected Gateway
    evaluator ordering before record/reward/profile side effects;
  - `tests/growth-architecture-boundary.test.js` asserts evaluation Gateway
    wiring stays service-owned and route-free.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - `node --test tests/learning-card-evaluation-service.test.js`;
  - `node --test tests/growth-evaluation-service.test.js tests/growth-architecture-boundary.test.js tests/growth-card-authoring-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-generation-context-service.test.js`;
  - `node --test tests/learning-card-authoring-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-routes.test.js`;
  - `npm run check`;
  - `npm test` with 173 passing tests;
  - `git diff --check`;
  - CodeGraph sync/status after edits: 107 files, 1107 nodes, 3705 edges.
- AI Ops:
  - intake classified the slice as H1 Gateway Runtime because the task touches
    Gateway;
  - required app-side checks passed from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`, and `git diff --check`;
  - evidence id: `evidence-9746b596-d726-4246-8ee3-1e2a47109a90`.
- Remaining architecture work:
  - expose Owner profile/trajectory projection in the plugin UI;
  - add experience-signal write route before making learner difficulty buttons
    active;
  - implement stage-assessment activation as a separate service/harness slice;
  - configure and smoke a real production Gateway evaluation endpoint before
    turning the model evaluator on in production.

## 2026-06-14 Growth AI Card Loop Service Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `d18d425`
  (`Add Growth AI card loop evaluation boundary`); not deployed.
- Scope:
  - added `docs/GROWTH_AI_CARD_LOOP.md` as the plugin-owned contract for
    learner profile -> next-card strategy -> card generation -> evaluation
    evidence -> profile/trajectory update;
  - added `learning-mastery-profile-service`,
    `learning-card-trajectory-service`, and
    `learning-next-card-strategy-service`;
  - added `src/stores/growth-learning-sqlite/mastery-profile.js` as the
    SQLite repository for `learning_growth_mastery_states`,
    `learning_growth_experience_signals`, and
    `learning_growth_card_trajectories`;
  - wired `growth-evaluation-service` so completed evaluations attempt
    summary-only profile update, next-card strategy, and trajectory recording
    after evaluation/reward settlement;
  - wired card generation context and generation requests to include
    `nextCardStrategy` and recent trajectory summaries.
- Product boundary:
  - this is the first closed-loop service slice; it does not yet enable
    fully automatic large-scale card generation or stage-assessment activation;
  - deterministic strategy is service-owned; Gateway remains the model boundary
    for authoring, and future production evaluation should use a Growth-owned
    Gateway evaluation client.
- Harness added:
  - `tests/learning-mastery-profile-service.test.js`;
  - `tests/learning-card-trajectory-service.test.js`;
  - `tests/learning-next-card-strategy-service.test.js`;
  - `tests/growth-evaluation-service.test.js`;
  - extended generation context/generation service tests for strategy payloads.
- Validation passed:
  - `node --test tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-next-card-strategy-service.test.js tests/growth-evaluation-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 162 passing tests;
  - `node --test tests/growth-learning-sqlite-store.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-routes.test.js`;
  - app AI Ops required-checks listed Gateway runtime tests because the task
    mentions Gateway; those app-side checks also passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 104 files, 1046 nodes, 3480 edges.
- AI Ops evidence:
  - `evidence-3c8635f5-00c3-4cfc-ae6a-c7fc6066ce74`.
- Remaining architecture work:
  - expose Owner profile/trajectory projection in the plugin UI;
  - add experience-signal write route before making learner difficulty buttons
    active;
  - implement stage-assessment activation as a separate service/harness slice.

## 2026-06-14 Growth Owner Profile Projection Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public`; not deployed.
- Scope:
  - added `learning-profile-projection-service` so Owner card generation reads
    a selected learner's bounded mastery, weakness, strength, experience signal,
    trajectory, and next-card strategy projection through a Growth service;
  - wired `learning-card-generation-context-service` to include
    `learningProfile` in the generation context for the selected target
    workspace, not the Owner workspace;
  - updated the Owner card generation UI to render a read-only `学习画像`
    panel with weakness, trajectory, and next recommendation summaries;
  - kept the projection summary-only and excluded raw answers, raw transcripts,
    raw prompts, and source document bodies from the UI/context path.
- Product boundary:
  - this slice makes the AI learning loop observable to Owner before generation;
  - it does not yet add learner difficulty feedback write routes or automatic
    stage-assessment activation;
  - production visual publish still requires the central Home AI embedded
    visual harness before deployment.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-profile-projection-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- Validation passed:
  - `node --test tests/learning-profile-projection-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 177 passing tests;
  - `git diff --check`;
  - CodeGraph status after edits: 109 files, 1128 nodes, 3842 edges.
- AI Ops:
  - intake classified the slice as H1 Gateway Runtime and did not require a
    visual lane;
  - required app-side checks passed from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`, and `git diff --check`;
  - evidence id: `evidence-e236c860-6c49-4462-8392-82e0919af890`.
- Remaining architecture work:
  - add an experience-signal write route before enabling learner difficulty
    feedback controls;
  - implement stage-assessment eligibility and activation as a separate
    service/harness slice;
  - run central visual evidence and production smoke before any deployment.

## 2026-06-14 Growth Learner Experience Signal Write Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public`; not deployed.
- Scope:
  - added `learning-experience-signal-service` as the Growth-owned learner
    feedback writer for `too_easy`, `right_level`, `too_hard`, and
    `not_learned`;
  - added `POST /api/v1/growth/cards/:taskCardId/experience-signals`, using
    the existing workspace bearer authorization path;
  - wired the embedded generated-card completion footer so active difficulty
    buttons call the Growth API helper, show progress/error/success state, and
    refresh the current card projection;
  - updated SQLite card projection so graph-bound cards expose `targetNodeIds`
    and `experienceSummary.latestSignalType` from the latest
    `learning_growth_experience_signals` row.
- Product boundary:
  - difficulty feedback is not grading and does not reopen evaluation or
    reflection;
  - learner feedback writes require graph target nodes. Legacy/unanchored cards
    show a disabled status instead of writing unanchored signals;
  - the service rejects raw answers, transcripts, prompts, answer keys, secrets,
    private paths, and provider configuration.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-experience-signal-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-learning-sqlite-store.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- Validation passed:
  - `node --test tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 182 passing tests;
  - `git diff --check`;
  - CodeGraph status after edits: 111 files, 1150 nodes, 3894 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require visual lane or deployment;
  - required app-side checks passed from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - evidence id: `evidence-7e5e39e7-7d09-4e6f-a572-9a3ed0a61c93`.
- Remaining architecture work:
  - implement stage-assessment eligibility and activation as a separate
    service/harness slice;
  - add a broader workflow recovery harness for listener restart/stale
    evaluation leases before scaling generated cards beyond the initial sample;
  - run central visual evidence and production smoke before any deployment.

## 2026-06-14 Growth Card Detail Back Navigation Hotfix

- Current workspace state: implemented, validated, committed, pushed to
  `origin` and `public`, and deployed to Mac production.
- Deployment:
  - runtime commit: `92f8144` (`Fix Growth card detail back navigation`);
  - static asset version query: `20260614-growth-navigation-v1`;
  - deployed with
    `npm run deploy:macos -- --plugin growth --execute` from
    `/Users/hermes-dev/HermesMobileDev/app`;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T032732Z-plugin-growth-manual`.
- User-visible bug:
  - on a Growth practice/generated-card detail page, Home AI right-swipe/back
    could return to the host instead of first returning to the Growth parent
    list.
- Fix:
  - added `public/growth-navigation-controller.js`;
  - `public/app.js` now emits `growth.plugin.navigation`, handles
    `hermes.plugin.back`, and returns `growth.plugin.back_result`;
  - card detail open pushes an internal Growth history entry; card refresh
    replaces the current entry instead of stacking duplicate detail states;
  - back at a card detail clears `selectedLearningTaskCardId`, renders the
    Growth board/list, and reports `handled:true`;
  - back at the Growth root reports `handled:false` so the Home AI host can
    own the next outer back action.
- Static asset version:
  - `20260614-growth-navigation-v1`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness updated:
  - `tests/growth-frontend-adapter.test.js` covers host back consumption on
    card detail, unhandled root back, and the new script load order;
  - `package.json` includes `public/growth-navigation-controller.js` in
    `npm run check`.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 155 passing tests;
  - `git diff --check`;
  - Home AI app `node tests/architecture-code-test-harness-map.test.js`;
  - CodeGraph status after edits: 96 files, 969 nodes, 3152 edges.
- Visual/behavior evidence:
  - local Playwright mobile dark harness loaded real Growth UI renderers and
    `growth-navigation-controller.js`, simulated `hermes.plugin.back`, and
    verified detail -> board transition plus `growth.plugin.back_result`
    `handled:true`;
  - screenshot:
    `/tmp/growth-navigation-back-mobile-dark.png`.
- AI Ops note:
  - `ai-ops-control-plane.js` classified the change as H3 and did not require
    a visual lane, but this was treated locally as H2 because it changes
    embedded plugin back/right-swipe behavior.
  - evidence ledger ids:
    `evidence-7e9cc5d7-a164-4237-9fbd-f952db55ceb1`,
    `evidence-46b0897b-c715-426a-8dcd-f4412e2a0e48`.

## 2026-06-14 Growth Audio Playback Hotfix

- Current workspace state: audio playback hotfix implemented, committed,
  pushed to `origin` and `public`, and deployed to Mac production.
- Deployment:
  - runtime hotfix commit: `beab6d6` (`Fix Growth audio playback recovery`);
  - asset cache-bust commit: `5a73060`
    (`Bump Growth audio playback asset version`);
  - static asset version query: `20260614-audio-playback-v1`;
  - deployed with
    `npm run deploy:macos -- --plugin growth --execute` from
    `/Users/hermes-dev/HermesMobileDev/app`;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T030758Z-plugin-growth-manual`.
- User-visible bug:
  - after recording audio in a generated Growth daily card, playback could
    show a browser-native error without a recoverable Growth UI state;
  - submitted `.webm` audio could also be served with an Ogg content type in
    some plugin-owned playback paths.
- Fix:
  - `public/growth-card-interaction-controller.js` now chooses a recorder MIME
    that is both `MediaRecorder`-recordable and browser-playable when possible,
    and records visible preview playback failure state;
  - `public/growth-legacy-task-ui.js` renders recoverable local preview error
    state and saved-audio playback error text;
  - `public/app.js` wires local preview and saved evidence `<audio>` error
    events to visible UI feedback;
  - `src/stores/growth-learning-sqlite/audio-metadata.js` now preserves
    explicit non-generic MIME values and maps `.webm` to `audio/webm` instead
    of `audio/ogg`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness updated:
  - `tests/growth-frontend-adapter.test.js` covers record/play MIME selection,
    preview playback failure state, recoverable recorder UI, and saved audio
    error rendering;
  - `tests/growth-learning-sqlite-audio.test.js` covers WebM playback MIME and
    explicit metadata priority;
  - `tests/growth-learning-sqlite-evidence-writes.test.js` now expects
    no-MIME `.webm` uploads to decode as `audio/webm`.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js`;
  - `node --test tests/growth-learning-sqlite-audio.test.js tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-store.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `node scripts/check-growth-docs-locality.js`;
  - `git diff --check`;
  - `npm test` with 153 passing tests.
- Production smoke passed:
  - `GET /` references `20260614-audio-playback-v1`;
  - `growth-card-interaction-controller.js`, `growth-legacy-task-ui.js`, and
    `app.js` return the new audio playback recovery hooks;
  - `GET /api/v1/growth/status?workspaceId=weixin_stephen` returns
    `ok:true`, `stage:plugin_sqlite`, `quick_check:ok`, and 10 audio BLOBs;
  - missing audio route returns bounded `404 growth_audio_not_found`;
  - existing Ogg submission audio streams with `200 Content-Type: audio/ogg`.
- Visual evidence:
  - Codex in-app Browser was unavailable (`Browser is not available: iab`), so
    local visual validation used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`;
  - mobile dark recorder error screenshot:
    `/tmp/growth-audio-preview-error-recorder-dark.png`;
  - mobile dark saved-audio error screenshot:
    `/tmp/growth-saved-audio-error-evidence-dark.png`;
  - verified preview failure keeps `重新录音` and `清除`, hides the bad local
    preview audio element, and saved-audio error text renders visible in dark
    mode with color `rgb(255, 177, 166)`.

## 2026-06-12 Growth Generated Card Full Flow UI

- Current workspace state: uncommitted dev changes in the Growth plugin
  workspace; not deployed yet.
- Product/UI fix:
  - generated daily card detail now renders one old-style vertical workflow
    page instead of a stepper-only detail;
  - visible order is status rail, score policy, learning target,
    prerequisites, lesson/worked example, guided practice, submission,
    saved-submission/waiting-evaluation/evaluation result, optional one-time
    reflection, and completion feedback;
  - the page keeps `daily_score_once`: one answer submission, one evaluation,
    optional one reflection, score-proportional reward, no pass-line gate, no
    retry-until-pass loop;
  - before submission, the rail shows learning/submission as in progress
    instead of marking learning complete merely because the card opened;
  - after submission, the active `提交作答` button is removed and saved
    evidence plus `等待批改` / `刷新批改` or the final evaluation is shown;
  - completion feedback no longer exposes active difficulty-signal buttons
    because Growth does not yet own the matching write route. It renders
    read-only difficulty chips and a status note instead.
- Projection fix:
  - plugin-owned SQLite board/detail projection now maps terminal
    `daily_score_once` evaluations to `completed_recent` / review even when
    the score is low or a legacy evaluator status says `needs_revision`,
    `draft_feedback`, or `reflection_required`;
  - formal `stage_assessment` cards still keep the legacy gated
    revision/reflection lanes.
- Changed files:
  - `src/stores/growth-learning-sqlite/projection.js`;
  - `public/growth-legacy-task-ui.js`;
  - `public/growth-homeai-legacy.css`;
  - `public/index.html`;
  - `tests/growth-learning-sqlite-projection.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - `node --test tests/growth-learning-sqlite-projection.test.js`;
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-rewards.test.js tests/growth-routes.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `npm test` with 149 passing tests;
  - `git diff --check`;
  - CodeGraph status reports the Growth index available: 95 files, 943 nodes,
    3074 edges.
- Local visual evidence:
  - in-app Browser was unavailable (`iab` missing), so local visual validation
    used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`;
  - mobile dark mock render at 390x844 verified flow rail, submission status,
    evaluation panel, reflection form after scroll, no submitted-state
    `提交作答` button, scrollable bottom content, and completion feedback
    with `activeExperienceButtons=0`, `readonlyMode=readonly`,
    `readonlyDisplay=flex`, and chip radius `999px`;
  - screenshots:
    `/tmp/growth-card-flow-v3-mobile-dark-top.png` and
    `/tmp/growth-card-flow-v3b-mobile-dark-bottom.png`.
  - 2026-06-12 rerun after the projection fix rendered a 390x844 dark mock
    with Home AI Playwright. It verified `.growth-shell` scrolls to the bottom
    (`scrollHeight=2765`, bottom `scrollTop=1921`), `提交反思` is visible,
    active difficulty buttons are absent, read-only difficulty mode is present,
    and panel text contrast is about `15.25`;
  - latest screenshots:
    `/tmp/growth-card-flow-v4-mobile-dark-top.png` and
    `/tmp/growth-card-flow-v4-mobile-dark-bottom.png`.
- Central visual harness status:
  - Home AI AI Ops intake/required-checks were run from
    `/Users/hermes-dev/HermesMobileDev/app`; the classifier returned H3 and did
    not require a visual lane, but Growth's plugin-local contract still treats
    central embedded visual evidence as required before production publish;
  - started Appium through
    `$HOME/.homeai-qa/scripts/macos-ios-appium-start.sh`;
  - started and later stopped Home AI live-debug server
    `npm run ios:pwa:debug` on `http://127.0.0.1:19073/`;
  - after cleanup, `19073` and `4723` were not listening;
  - `npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/ --theme dark --timeout-ms 70000 --json`
    first failed because no `--app-url` was provided and the simulator stayed
    on a previous `127.0.0.1` page; screenshot artifact:
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260612T095308Z.png`;
  - reran with
    `--app-url 'https://wardrobe-xuxin.synology.me:8555/?source=pwa'`; Home AI
    loaded with `authenticated:false`, `app.className="app hidden"`, and no
    Growth shell/frame; screenshot artifact:
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260612T095455Z.png`;
  - both central visual runs are not pass evidence and should not be used for
    release acceptance until an authenticated Home AI host can render the Growth
    plugin shell/frame.
  - 2026-06-12 rerun with the same central command also failed because Home AI
    loaded unauthenticated (`authenticated:false`, `app.className="app hidden"`)
    and no Growth shell/frame existed. Screenshot artifact:
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260612T101822Z.png`.
  - after the rerun, the local live-debug server and Appium listener were
    stopped; `19073` and `4723` were not listening.
- AI Ops evidence ledger:
  - local test pass:
    `evidence-b195e9bb-721c-4649-aa57-2bd79fa980d2`;
  - central visual blocked:
    `evidence-a14ef3e2-147e-49c3-99c4-fa0d8db039e8`.
  - latest local test pass:
    `evidence-2a0e08b4-aae1-4af3-942d-04f76876805c`;
  - latest local visual pass:
    `evidence-6eac2333-2f40-411f-8eec-b8e892c51ba6`;
  - latest central visual blocked:
    `evidence-5b02b83e-501f-4379-920c-e516c2791ac1`.

## 2026-06-12 Growth Generated Card Interaction UI

- Deployment status:
  - committed code/docs as `07217804cb39` (`Add Growth card interaction flow`);
  - pushed `main` to `origin` (`pentiumxp/Growth.git`) and `public`
    (`pentiumxp/Growth-Public.git`);
  - deployed from
    `/Users/hermes-dev/HermesMobileDev/plugins/growth` to
    `/Users/hermes-host/HermesMobile/plugins/growth` using the central Home AI
    `deploy-macos-production.js` plugin path;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260612T035549Z-plugin-growth-growth-card-interaction`;
  - restarted launchd label `com.hermesmobile.plugin.growth`;
  - deploy health validation passed for
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest`;
  - direct production smokes passed for `/`, the
    `growth-card-interaction-controller.js` static asset, manifest projection,
    Growth status for `weixin_stephen`, and board projection for
    `weixin_stephen`;
  - unauthenticated Home AI same-origin proxy smoke returned expected `403`;
  - authenticated proxy smoke was not completed because local `sudo -n` access
    to read the production Owner web-key secret was blocked by
    `sudo: a password is required`; no secret value was read or printed;
  - AI Ops evidence ledger record:
    `evidence-f9b82964-b126-4a38-9591-f5e77991b1e0`.
- Implemented plugin-local learner interaction for generated daily Growth
  cards:
  - one answer submission from the card detail quick-check step;
  - optional browser recording for answer evidence;
  - visible saved-submission, waiting-evaluation, evaluation-result, and
    error states;
  - manual `刷新批改` action backed by
    `POST /api/v1/growth/evaluations/process`;
  - one optional reflection with text/audio evidence;
  - submitted reflection playback/status without reopening the form.
- Added frontend API helpers in `public/growth-api-client.js`:
  `fetchGrowthCard`, `submitGrowthCardEvidence`,
  `processGrowthEvaluations`, `submitGrowthCardReflection`, and embedded
  proxy audio URL resolution.
- Added modular frontend controller:
  `public/growth-card-interaction-controller.js`. `public/app.js` now wires
  the controller instead of owning recording encoding or evidence submission
  workflow logic.
- Updated generated card renderer:
  `public/growth-legacy-task-ui.js` now renders the submission form, recorder
  controls, submission status, one-shot evaluation panel, optional reflection
  form, and reflection status/audio playback.
- Updated styling in `public/growth-homeai-legacy.css` for the new evidence,
  evaluation, reflection, recorder, and dark-mode surfaces.
- Updated static version in `public/index.html` to
  `20260612-card-interaction-v1`.
- Updated docs:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Updated harness:
  - `tests/growth-frontend-adapter.test.js` covers API helper paths, embedded
    proxy audio URL resolution, pre-submission generated-card UI, one-shot
    evaluation UI, and submitted-reflection UI;
  - `tests/growth-architecture-boundary.test.js` now requires the interaction
    controller module and index load order;
  - `package.json` includes `public/growth-card-interaction-controller.js` in
    `npm run check`.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-rewards.test.js tests/growth-routes.test.js`;
  - `npm run check`;
  - `npm test` with 145 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `git diff --check`.
- Browser evidence:
  - started a local plugin instance on `http://127.0.0.1:4893`;
  - Playwright rendered a dark-mode generated-card mock at mobile width,
    verified score text `确定分数 72/100`, disabled submitted state, reflection
    recorder controls, and internal scroll reachability for `提交反思`.
- Central visual harness status:
  - attempted the Home AI central command
    `npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/`;
  - result was `{"ok":false,"error":"fetch failed"}` because the
    `19073` live-debug server was not running;
  - do not count this as a passing central iOS visual result before any
    production publish.

## 2026-06-11 Growth Documentation Locality

- Product direction: all Growth-specific documentation belongs in the Growth
  plugin workspace. The Home AI app workspace remains canonical only for broad
  platform contracts and runbooks.
- Added plugin-local Growth documentation index:
  `docs/GROWTH_DOCS_INDEX.md`.
- Added consolidated card generation rule summary:
  `docs/GROWTH_CARD_GENERATION_RULES.md`.
- Migrated 17 Growth-specific Home AI docs into `docs/home-ai-growth/`:
  - FanFan learning system and evergreen card design/implementation notes;
  - Growth learning module doc;
  - Growth KG requirements, architecture, design, and implementation notes;
  - teaching-card flow and implementation notes;
  - pluginization plan;
  - workflow contract harness;
  - mastery profile;
  - async evaluation queue;
  - Growth stuck/waiting-AI and submit-disabled runbooks.
- Added locality harness:
  - `scripts/check-growth-docs-locality.js`;
  - `tests/growth-docs-locality.test.js`.
- Updated local pointers:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `README.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md`;
  - `package.json` check script.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `npm test` with 103 passing tests;
  - `git diff --check`.
- Current boundary:
  - Growth-specific docs should be updated under this plugin workspace first;
  - historical migrated docs may still mention Home AI `adapters/*` or
    `server-routes/*` paths as provenance, but those are not plugin runtime
    ownership boundaries;
  - broad Home AI platform contracts, deployment runbooks, AI Ops docs,
    Gateway runtime docs, Action Inbox, Web Push, and reference-memory docs
    remain centralized in the Home AI app workspace.

## 2026-06-11 Growth Card Authoring Gateway Boundary

- Product/architecture decision: Growth owns card authoring. New card
  generation should be implemented inside the Growth plugin, not by calling
  Home AI old Growth route/server internals.
- Gateway is the only model boundary for card authoring. Growth may depend on
  Home AI provided Gateway access/config, but must not direct-call OpenAI,
  Claude, DeepSeek, or other model vendors.
- Documented service split:
  - `learning-card-generation-service`;
  - `learning-card-authoring-service`;
  - `growth-gateway-authoring-client`;
  - `learning-card-authoring-validation-service`.
- Implemented the first service slice:
  - `src/services/learning-card-authoring-service.js` assembles summary-only
    authoring input, calls Gateway, applies validation/repair policy, and
    delegates accepted drafts to an injected publisher;
  - `src/services/growth-gateway-authoring-client.js` aggregates Gateway SSE
    and ordinary JSON responses into model text without direct vendor calls;
  - `src/services/learning-card-authoring-validation-service.js` validates
    JSON drafts, `teachingFlow`, role policy, graph plan consistency, stage
    assessment coverage, and privacy/bounded-content rules.
- Updated docs:
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Added boundary harness:
  - `scripts/check-growth-card-authoring-boundary.js`;
  - `tests/growth-card-authoring-boundary.test.js`.
- Added fake Gateway service harness:
  - `tests/learning-card-authoring-service.test.js`.
- Harness coverage:
  - required docs mention Gateway-only card authoring, structured summary-only
    inputs, authoring draft flow, `teachingFlow` validation, role policy,
    graph binding validation, privacy scan, SSE and JSON Gateway modes, and
    fake Gateway scenarios;
  - source scan rejects direct provider API keys, provider SDK imports, and
    direct provider endpoints in `src/` and `scripts/`.
- Fake Gateway scenarios cover valid stream, valid JSON, empty output, invalid
  JSON with repair success, repair failure, missing schema fields, privacy scan
  failure, timeout, graph policy mismatch, and publisher transaction failure.
- Current boundary: card generation is exposed through the workspace-bearer
  `POST /api/v1/growth/cards/generate` route and writes accepted drafts to
  Growth SQLite through the plugin-owned publisher. Production use still
  requires a configured Gateway authoring endpoint/access boundary.
- Validation passed:
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js`;
  - `npm run check`;
  - `npm test` with 121 passing tests;
  - `git diff --check`.

## 2026-06-11 Growth Graph And History Card Generation

- Implemented graph-plus-history generation orchestration:
  - `src/services/learning-card-generation-service.js` creates or accepts a
    validated graph plan, reads bounded historical summaries, adds graph node
    source summaries, calls authoring, and returns the published card result;
  - `src/stores/growth-learning-sqlite/history-summary.js` summarizes recent
    cards, evaluations, mastery states, experience signals, and aggregate
    counts without exposing raw learner submissions or transcripts;
  - `src/stores/growth-learning-sqlite/card-authoring-publisher.js` upserts
    `learning_task_cards` and writes `learning_card_graph_bindings` in one
    SQLite transaction, rolling back on graph-binding failure.
- Wired runtime composition:
  - `src/app/services.js` creates Gateway authoring client, validation,
    authoring, generation, history, and publisher dependencies;
  - `src/config/env.js` reads Gateway authoring endpoint/token path settings;
  - `src/routes/growth-routes.js` exposes
    `POST /api/v1/growth/cards/generate` behind workspace-bearer
    authorization.
- Updated docs and boundary harness:
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `README.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- New focused harness:
  - `tests/learning-card-generation-service.test.js` covers graph plan
    creation, historical summary injection, raw submission exclusion from
    Gateway input, transactional card+binding publish, plan failure before
    Gateway, and rollback on binding failure;
  - `tests/growth-routes.test.js` covers the protected generation route.
- Validation passed:
  - `node --test tests/learning-card-generation-service.test.js`;
  - `node --test tests/growth-routes.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-card-authoring-boundary.test.js tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `npm test` with 121 passing tests;
  - `git diff --check`.

## 2026-06-11 Daily Card One-Pass Scoring Policy

- Product rule: daily ordinary Growth cards should keep the existing card UI
  shape but must not behave like pass/fail exams. The policy is documented in
  `docs/GROWTH_CARD_GENERATION_RULES.md` as `daily_score_once`.
- Daily generated cards now publish this completion policy in card `raw_json`:
  - one submission evaluation;
  - one optional reflection;
  - completion after the first evaluation;
  - score-proportional learning-coin settlement;
  - no pass-line gate.
- Implemented runtime enforcement:
  - `src/stores/growth-learning-sqlite/card-authoring-publisher.js` writes
    `completionPolicy.mode=daily_score_once` for generated cards;
  - `src/stores/growth-learning-sqlite/evidence-writes.js` rejects a second
    submission or second reflection for daily-score cards;
  - `src/services/growth-evaluation-service.js` no longer emits
    `needs_revision` for the deterministic daily evaluator. It records one
    score, feedback, and next-practice suggestions;
  - `src/stores/growth-learning-sqlite/rewards.js` settles learning coins by
    `score / 100 * reward_cap_coins` and completes the card regardless of a
    pass/fail threshold;
  - `src/stores/growth-learning-sqlite/history-summary.js` treats
    `status=completed` as completion evidence even when no pass-line concept
    is used.
- UI boundary: public DTO fields remain compatible with the existing renderer
  (`latestSubmission`, `latestEvaluation`, `latestReflection`, `rewardPolicy`,
  `rewardState`, `laneId`, `nextAction`, `primaryAction`, and
  `teachingFlow`). The backend should avoid producing `needs_revision` or
  `reflection_required` for daily-score cards.
- Verified production history remains available for Stephen/Stefan under
  `weixin_stephen` by read-only SQLite aggregation:
  - cards: 48;
  - submissions: 18;
  - evaluations: 24;
  - reflections: 5;
  - audio BLOBs: 10;
  - reward settlements: 5;
  - mastery states: 22;
  - experience signals: 2;
  - native graph nodes: 294;
  - native graph edges: 329.
- Focused validation passed:
  - `node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-rewards.test.js tests/growth-learning-sqlite-store.test.js tests/learning-card-generation-service.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`.
- Full validation passed:
  - `npm run check`;
  - `npm test` with 121 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `git diff --check`.

## 2026-06-11 Growth Knowledge Graph Native Import Harness

- The recovered Fan Fan UK/HK IGCSE/A-Level graph source pack remains a Mac
  staging artifact and has not been copied into the Growth runtime or deployed:
  `/Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json`.
- Added a native import harness:
  - `src/services/learning-graph-import-service.js`;
  - `src/stores/growth-learning-sqlite/graph-schema.js`;
  - `src/stores/growth-learning-sqlite/graph-repository.js`;
  - `scripts/import-learning-graph-pack.js`;
  - `tests/learning-graph-import-service.test.js`;
  - `tests/learning-graph-repository.test.js`.
- Dry-run mode remains the default and does not mutate Growth SQLite. Write
  mode requires `--write --target-db`, checkpoints/truncates the target WAL,
  creates a timestamped SQLite backup when the target exists, and imports only
  bounded native graph metadata into `learning_graph_*` tables.
- Validation checks include supported schema version, `summary_only` privacy,
  required domain pack/node/edge fields, duplicate node/edge ids, missing edge
  endpoints, prerequisite cycles, unsafe raw-content key names, and absolute or
  UNC source-document paths.
- Recovered graph dry-run and throwaway SQLite write validation passed:
  - sha256:
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - schemaVersion: `hermes.learningGraphSeed.v0.1`;
  - importId: `kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1`;
  - sourceDocuments: 15;
  - domainPacks: 1;
  - nodes: 294;
  - edges: 329;
  - prerequisite edges: 34;
  - graph plans: 0;
  - card graph bindings: 0;
  - duplicate node ids, duplicate edge ids, missing edge endpoints,
    prerequisite cycles, rejected records, unsafe raw-content keys, and
    absolute source-document paths were all 0.
- The dry-run reports 12 `cross_domain_prerequisites_require_review` warnings.
  These are mostly Lower Secondary English/Science to IGCSE ESL/Biology/
  Chemistry/Physics bridge edges. They are acceptable as warnings in this
  phase, but native repository import should model or approve the bridge policy
  before graph-required card generation is enabled.
- Focused validation passed:
  - `node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js`;
  - `node scripts/import-learning-graph-pack.js --source /Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 --dry-run --json`.
- Full validation passed after adding native graph import write mode:
  - `npm run check`;
  - `npm test` with 93 passing tests.
- The import tools were deployed to Mac production with the central deploy
  script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T103900Z-plugin-growth-growth-knowledge-graph-import-tools`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- A readable temporary source copy was prepared for the production permission
  boundary:
  `/tmp/homeai-growth-kg-import/fanfan-uk-hk-igcse-a-level-graph-v1.json`.
  Its sha256 matches
  `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`.
- Production data import completed by running the production-path command as
  `hermes-host` through the same bounded sudo password-file mechanism used by
  the central Mac deploy script. The password was not printed.
- Production import backup:
  `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-graph-import-20260611T104021Z.sqlite3`.
- Production import readback:
  - `learning_graph_imports`: 1;
  - `learning_graph_domain_packs`: 1;
  - `learning_graph_nodes`: 294;
  - `learning_graph_edges`: 329;
  - `learning_graph_plans`: 0;
  - `learning_card_graph_bindings`: 0;
  - import prerequisite edges: 34;
  - missing graph tables: none;
  - source sha256 matched
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - duplicate ids, missing edge endpoints, prerequisite cycles, rejected
    records, unsafe raw-content keys, and absolute source-document paths were
    all 0.
- SQLite `PRAGMA quick_check` returned `ok` after import.
- Growth production service smoke still passed after import:
  - direct manifest returned `id=growth`;
  - status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards.
- Exact production write command used:

```bash
/Users/hermes-host/HermesMobile/runtime/node-current/bin/node \
  /Users/hermes-host/HermesMobile/plugins/growth/scripts/import-learning-graph-pack.js \
  --source /tmp/homeai-growth-kg-import/fanfan-uk-hk-igcse-a-level-graph-v1.json \
  --target-db /Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3 \
  --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 \
  --write \
  --json
```

- Exact readback command:

```bash
/Users/hermes-host/HermesMobile/runtime/node-current/bin/node \
  /Users/hermes-host/HermesMobile/plugins/growth/scripts/import-learning-graph-pack.js \
  --target-db /Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3 \
  --readback \
  --import-id kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1 \
  --json
```

## 2026-06-11 Growth Knowledge Graph Plan And Binding Services

- Added native graph planning and card-binding services on top of the imported
  `learning_graph_*` tables:
  - `src/services/learning-graph-plan-service.js`;
  - `src/services/learning-card-graph-binding-service.js`;
  - repository lookup and persistence helpers in
    `src/stores/growth-learning-sqlite/graph-repository.js`;
  - `tests/learning-graph-plan-binding-service.test.js`.
- Current service behavior:
  - creates `learningGraphPlan` records from native graph nodes;
  - resolves direct prerequisite nodes from `learning_graph_edges` where
    `edge_type='prerequisite'`;
  - rejects missing target nodes and missing prerequisite nodes;
  - focused `teaching` and `practice` plans require one target node;
  - `stage_assessment` plans require explicit assessment coverage node ids;
  - card bindings require an existing plan and valid binding nodes;
  - formal-card validation can fail closed with
    `learning_graph_plan_required` when graph-required mode is requested.
- This section was superseded by the later graph-plus-history generation work:
  new plugin-owned generation now uses graph plans, bounded historical
  summaries, Gateway authoring, and transactional card+binding publishing.
  Existing compatibility cards can still render safely.
- Focused validation passed:
  - `node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js tests/learning-graph-plan-binding-service.test.js`
    with 13 passing tests.
- Full validation passed:
  - `npm run check`;
  - `npm test` with 98 passing tests.
- Deployed code to Mac production through the central Home AI deploy script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T104612Z-plugin-growth-growth-knowledge-graph-plan-binding-services`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- Production post-deploy smoke passed:
  - graph import readback still reports 1 import, 1 domain pack, 294 nodes,
    329 edges, 0 graph plans, and 0 card graph bindings;
  - direct manifest returned `id=growth`;
  - status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards;
  - `learning-graph-plan-service.js`,
    `learning-card-graph-binding-service.js`, and
    `tests/learning-graph-plan-binding-service.test.js` exist in the
    production plugin path.

## 2026-06-11 Growth Knowledge Graph Runtime API Boundary

- Wired native graph planning services into the Growth service graph:
  - `growthLearningStore.learningGraphRepository` is now exposed by the
    plugin-owned SQLite store facade;
  - `src/app/services.js` constructs
    `learningGraphPlanService` and `learningCardGraphBindingService`;
  - `src/routes/growth-routes.js` exposes protected runtime routes.
- Added protected workspace-bearer routes:
  - `POST /api/v1/growth/graph/plans`;
  - `POST /api/v1/growth/cards/:taskCardId/graph-binding`.
- Route behavior:
  - requires the workspace-local `.hermes-growth/access-key.txt` bearer and a
    writable `workspace_id`;
  - normalizes snake_case and camelCase graph payload fields;
  - converts authorized `growth:<workspace>` ids into the service workspace id;
  - uses the URL `:taskCardId` for card graph binding, not any body override;
  - returns `201` on successful plan/binding writes and `400` for bounded graph
    service validation failures.
- Added route harness coverage in `tests/growth-routes.test.js` for graph plan
  writes, card graph-binding writes, authorization failures, field
  normalization, URL card-id precedence, and service rejection mapping.
- Focused validation passed:
  - `node --test tests/growth-routes.test.js`;
  - `node --test tests/learning-graph-plan-binding-service.test.js`.
- Full local validation passed:
  - `npm run check`;
  - `npm test` with 100 passing tests;
  - `git diff --check`.
- AI Ops intake classified the task as H3 and the required app-side checks
  passed:
  - `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`.
- Deployed code to Mac production through the central Home AI deploy script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T110648Z-plugin-growth-growth-knowledge-graph-runtime-api`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- Production post-deploy smoke passed:
  - direct manifest returned `id=growth`;
  - status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards;
  - graph import readback still reports 1 import, 1 domain pack, 294 nodes,
    329 edges, 0 graph plans, 0 card graph bindings, 34 prerequisite edges,
    and matching source sha256
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - unauthenticated graph plan and graph-binding POST requests for
    `weixin_stephen` returned `403 permission_denied`.
- Boundary at that point, now superseded by the graph-plus-history generation
  section above:
  - production card generation was not graph-required yet at that stage;
  - existing compatibility cards, board projection, submissions, evaluations,
    reflection writes, and Growth learning-coin settlement remain unchanged;
  - do not production-smoke these routes with write payloads unless the caller
    intends to create durable `learning_graph_plans` or
    `learning_card_graph_bindings` rows.

## 2026-06-11 Growth Regenerable Card Retirement

- Product decision: old original-board compatibility cards, old Knowledge
  Graph pilot projection cards, and old evergreen cards are regenerable runtime
  rows. They should not drive the future Growth architecture. This supersedes
  the earlier historical notes above that said compatibility cards were left
  unchanged.
- Added the dry-run-first retirement harness:
  - `src/services/growth-card-retirement-service.js`;
  - `src/stores/growth-learning-sqlite/card-retirement.js`;
  - `scripts/retire-growth-cards.js`;
  - `tests/growth-card-retirement-service.test.js`.
- The harness is workspace-scoped and never hard-deletes rows. Write mode marks
  candidate `learning_task_cards` as `retired`, writes a bounded
  `raw_json.growthRetirement` audit marker, updates activation metadata when
  the columns exist, and cancels only open `pending`/`retry`/`processing`
  evaluation jobs for the retired cards.
- Learner history is intentionally preserved: submissions, evaluations,
  reflections, audio blobs, artifacts, rewards, and Growth learning-coin
  settlement rows remain addressable.
- Default candidate policy:
  - includes old board projection, old Knowledge Graph seed projection, and
    old evergreen/regenerable projection cards;
  - includes completed cards because they can also be regenerated;
  - excludes already hidden `cancelled`/`canceled`/`retired`/`superseded`
    cards;
  - excludes native graph-bound cards by default when
    `learning_card_graph_bindings` or `raw_json.learningGraphPlanId` exists.
- Documentation updated:
  - `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed before deployment:
  - `node --test tests/growth-card-retirement-service.test.js`;
  - `node --test tests/growth-card-retirement-service.test.js tests/growth-learning-sqlite-store.test.js`;
  - `npm run check`;
  - `npm test` with 102 passing tests;
  - `git diff --check`;
  - Home AI app-side `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app-side `git diff --check`.
- AI Ops evidence:
  - intake class: H3;
  - ledger record:
    `evidence-e3401b9e-4b8c-42b7-bdd3-3dc01e00d11a`.
- Production dry-run before writing, for workspace `weixin_stephen`:
  - candidateCount: 30;
  - visible board cards before retirement: 9;
  - total board cards before retirement: 30;
  - hidden future cards before retirement: 21;
  - byReason:
    `legacy_evergreen_regenerable_projection=7`,
    `legacy_kanban_projection=11`,
    `legacy_knowledge_graph_seed_projection=12`;
  - byStatus: `published=28`, `completed=2`;
  - graphBoundCount: 0;
  - related rows observed for candidates:
    `submissions=18`, `evaluations=16`, `reflections=5`,
    `artifacts=29`, `audioBlobs=10`, `evaluationJobs=6`, `rewards=2`.
- Deployed code to Mac production through the central Home AI deploy script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T120233Z-plugin-growth-growth-regenerable-card-retirement`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- Production retirement write completed by running the production-path harness
  as `hermes-host`. The sudo password was not printed or recorded.
- Production data backup before retirement:
  `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260611T120318Z.sqlite3`.
- Production write result:
  - `quick_check=ok`;
  - retired cards: 30;
  - remaining candidates after write: 0;
  - open evaluation jobs cancelled: 0;
  - board after retirement for `weixin_stephen`: `card_count=0`,
    `total_card_count=0`, `hidden_future_card_count=0`.
- Production post-write smoke passed:
  - direct manifest returned `id=growth`;
  - status for `weixin_stephen` returned `ok=true` and
    `source=growth-plugin-sqlite`;
  - board for `weixin_stephen` returned `ok=true`,
    `source=growth-plugin-sqlite`, and no visible/hidden board cards;
  - direct card detail for a retired card still returned HTTP 200 with
    `card.status=retired`, proving history/detail rows remain addressable;
  - dry-run after write returned `candidateCount=0`;
  - graph import readback still reports 1 import, 1 domain pack, 294 nodes,
    329 edges, 0 graph plans, 0 card graph bindings, 34 prerequisite edges,
    and matching source sha256
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - workspace SQL readback reported `cancelled=18`, `retired=30`,
    `retiredWithMarker=30`, `open_jobs=0`, and preserved related rows:
    `submissions=18`, `evaluations=24`, `reflections=5`,
    `audio_blobs=10`, `rewards=5`.
- Current boundary:
  - the old board is intentionally empty for `weixin_stephen`;
  - new production cards should be generated from the native Growth/KG service
    path, not from the retired compatibility projection rows;
  - this retirement step did not enable native graph-required card generation,
    but the later graph-plus-history generation service now provides that path;
  - no platform `通宝` exchange or monthly clearing behavior changed.

## 2026-06-11 Growth Core Module Refactor Started

- Goal: make the Growth plugin core clearer, more modular, and easier to
  extend while preserving current runtime behavior.
- Scope is plugin-internal only. Platform `通宝` exchange, Home AI host
  workflows, production deployment, and Gateway callable changes are out of
  scope for this step.
- Added Growth-local architecture documentation:
  `docs/GROWTH_PLUGIN_ARCHITECTURE.md`.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to point to the Growth-local
  architecture document and declare the new focused core helper harness.
- Split foundational SQLite store helpers out of the large store facade:
  - `src/stores/growth-learning-sqlite/core.js` owns shared SQLite/table,
    dynamic insert/upsert, bounded parsing, primitive normalization, and
    required table list helpers.
  - `src/stores/growth-learning-sqlite/identifiers.js` owns stable Growth ids
    and hashes for submissions, reflections, evaluation jobs, sessions,
    rewards, ledger entries, and audio blobs.
  - `src/stores/growth-learning-sqlite/audio-metadata.js` owns bounded audio
    evidence metadata and public audio DTO projection.
  - `src/stores/growth-learning-sqlite/audio.js` owns plugin-owned audio
    playback, SQLite BLOB priority reads, bounded legacy audio file lookup, and
    historical audio BLOB backfill.
  - `src/stores/growth-learning-sqlite/projection.js` owns board/card public
    DTO shaping, Growth lane grouping, sequence visibility, summaries, and
    bounded submission/evaluation/reflection/reward projections.
  - `src/stores/growth-learning-sqlite/evidence-writes.js` owns
    submission/reflection evidence write transactions, interaction session
    creation, evidence audio BLOB insertion, legacy kanban card id resolution,
    and pending evaluation job enqueueing.
  - `src/stores/growth-learning-sqlite/evaluation-jobs.js` owns evaluation job
    listing, claiming, completion, retry/failure state, evaluation context
    reads, bounded job projection, and evaluation record writes.
  - `src/stores/growth-learning-sqlite/rewards.js` owns evaluation reward
    settlement, task completion side effects, Growth learning-coin balance, and
    monthly clear ledger writes. Platform `通宝` exchange remains out of scope.
  - `src/stores/growth-learning-sqlite-store.js` remains the public store
    facade and is now mostly composition plus board/card read entrypoints.
  - `src/services/growth-service-models.js` owns pure bounded service
    projections for status, board, snapshot card fallback, and migration
    summaries.
  - `src/services/home-ai-growth-facade-client.js` owns Home AI Growth facade
    base URL normalization, workspace query building, and access-key header
    dispatch.
- Added focused harness:
  `tests/growth-learning-sqlite-core.test.js`.
  `tests/growth-learning-sqlite-audio.test.js`.
  `tests/growth-learning-sqlite-projection.test.js`.
  `tests/growth-learning-sqlite-evidence-writes.test.js`.
  `tests/growth-learning-sqlite-evaluation-jobs.test.js`.
  `tests/growth-learning-sqlite-rewards.test.js`.
  `tests/growth-service-models.test.js`.
- Validation passed:
  - Home AI AI Ops intake classified the work as H3 and required architecture
    docs/test-map checks;
  - `npm run check`;
  - `node --test tests/growth-learning-sqlite-core.test.js`;
  - `node --test tests/growth-learning-sqlite-core.test.js tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-store.test.js`;
  - `node --test tests/growth-learning-sqlite-audio.test.js tests/growth-learning-sqlite-store.test.js`;
  - `node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-learning-sqlite-rewards.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-service-models.test.js tests/growth-service.test.js`;
  - `npm test` with 68 passing tests;
  - Home AI app-side
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`.
- Generated local `.codegraph/` test byproduct was removed and is not part of
  the change.
- Next refactor targets:
  1. split `growth-service.js` fallback policy into explicit provider
     strategies if service branching grows again;
  2. split
     `public/app.js` route/view-model adapters.

## 2026-06-11 Growth Architecture Optimization Continued

- Continued the architecture optimization plan requested after the core SQLite
  split. Scope remains Growth-plugin internal; platform `通宝` exchange stays
  outside this refactor.
- Service providerization:
  - added `src/services/growth-read-orchestrator.js` for explicit status,
    board, card, and migration readback fallback order;
  - added `src/services/growth-providers/sqlite-provider.js`;
  - added `src/services/growth-providers/home-ai-facade-provider.js`;
  - added `src/services/growth-providers/snapshot-provider.js`;
  - reduced `src/services/growth-service.js` to service composition and write
    delegation.
- Frontend adapter split:
  - added `public/growth-appearance.js` for host appearance/viewport mapping;
  - added `public/growth-api-client.js` for workspace query, URL state, and
    bounded fetch errors;
  - added `public/growth-view-model.js` for board/card/overview projection;
  - added `public/growth-route-controller.js` for manifest route/action launch
    handling;
  - `public/app.js` is now a boot/wiring script.
- Architecture guard:
  - added `tests/growth-architecture-boundary.test.js` to prevent routes from
    importing stores directly, prevent `growth-service.js` from owning Home AI
    URL/header construction, keep the SQLite store facade out of file-system
    scanning, and keep frontend boot code from reabsorbing route/view-model
    logic.
- Added focused harness:
  - `tests/growth-service-providers.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Updated docs:
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `package.json` check script now covers the new service and frontend helper
    files.
- Validation passed:
  - `node --test tests/growth-service-providers.test.js tests/growth-service-models.test.js tests/growth-service.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-service.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js tests/growth-service-providers.test.js tests/growth-frontend-adapter.test.js`;
  - `npm run check`;
  - `npm test` with 79 passing tests;
  - Home AI app-side
    `node --check scripts/deploy-macos-production.js`;
  - Home AI app-side `node tests/macos-production-deploy-script.test.js`;
  - Home AI app-side `node tests/production-status-smoke-harness.test.js`;
  - Home AI app-side `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - local dev service smoke on `127.0.0.1:4893` for Growth manifest, status,
    board, index helper script links, and helper asset reads.
- Production deploy completed through the central Home AI deploy script:
  - command shape:
    `npm run --silent deploy:macos -- --plugin growth --json --reason growth-architecture-optimization --allow-dirty --execute`;
  - target: `plugin:growth`;
  - production path: `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T024933Z-plugin-growth-growth-architecture-optimization`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - deploy health URL passed:
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest`.
- Production smoke passed:
  - direct plugin manifest returned `id=growth`;
  - direct plugin status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - production served `growth-appearance.js`, `growth-api-client.js`,
    `growth-view-model.js`, `growth-route-controller.js`, and `app.js`;
  - Home AI same-origin proxy
    `/api/hermes-plugins/growth/proxy/?embed=hermes&workspaceId=weixin_stephen`
    returned HTML containing `growth-root` and `growth-route-controller.js`.

## 2026-06-11 Growth Write Provider Boundary Continued

- Continued the plugin-internal architecture optimization after the read
  provider and frontend adapter split.
- Write providerization:
  - added `src/services/growth-write-orchestrator.js` for explicit
    plugin-owned command policy and bounded unavailable errors;
  - added `src/services/growth-providers/sqlite-write-provider.js` for SQLite
    submission, reflection, and Growth learning-coin command delegation;
  - kept `src/services/growth-providers/sqlite-provider.js` read-focused by
    removing direct write command exports;
  - reduced `src/services/growth-service.js` further so write methods are
    service-surface aliases to the write orchestrator.
- Architecture guard expanded:
  - `tests/growth-architecture-boundary.test.js` now checks read/write SQLite
    provider separation and keeps write error literals out of the composition
    service.
- Added focused harness:
  - `tests/growth-service-write-providers.test.js`.
- Updated docs:
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `package.json` check script now covers the new write orchestrator and
    SQLite write provider.
- Focused validation passed:
  - `node --test tests/growth-service-write-providers.test.js tests/growth-service-providers.test.js tests/growth-architecture-boundary.test.js tests/growth-service.test.js tests/growth-routes.test.js`
    with 33 passing tests.
- Full local validation passed:
  - `npm run check`;
  - `npm test` with 85 passing tests;
  - Home AI app-side
    `node scripts/plugin-workspace-platform-contract-check.js --json`;
  - Home AI app-side `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Home AI app-side `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app-side `node --check scripts/deploy-macos-production.js`;
  - Home AI app-side `node tests/macos-production-deploy-script.test.js`;
  - Home AI app-side `node tests/production-status-smoke-harness.test.js`;
  - `git diff --check`;
  - local dev service smoke on `127.0.0.1:4894` for Growth manifest, status,
    board, index helper script links, and helper asset reads.
- Production deploy completed through the central Home AI deploy script:
  - command shape:
    `npm run --silent deploy:macos -- --plugin growth --json --reason growth-write-provider-boundary --allow-dirty --execute`;
  - target: `plugin:growth`;
  - production path: `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T030117Z-plugin-growth-growth-write-provider-boundary`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - deploy health URL passed:
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest`.
- Production smoke passed:
  - direct plugin manifest returned `id=growth`;
  - direct plugin status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards;
  - production contains `src/services/growth-write-orchestrator.js`,
    `src/services/growth-providers/sqlite-write-provider.js`, and
    `tests/growth-service-write-providers.test.js`;
  - production served the embedded frontend helper assets;
  - unauthenticated Home AI same-origin proxy access returned 403 as expected.
    Authenticated proxy HTML smoke was not run because the current shell could
    not non-interactively read the production owner web key; no secret was
    printed or copied.

## 2026-06-10 Growth Legacy UI Parity Projection

- Status: committed, pushed, deployed to Mac production, and production-smoked.
- Changed files:
  - `public/app.js`;
  - `src/stores/growth-learning-sqlite-store.js`;
  - `tests/growth-learning-sqlite-store.test.js`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- `public/app.js` now maps Home AI launch/query and viewport appearance
  metadata onto the iframe root before rendering legacy Growth UI. Accepted
  inputs include `pluginTheme`/`theme` and `pluginFontSize`/`fontSize`; Home AI
  `default` maps to the legacy CSS `standard` font-size token.
- The plugin-owned SQLite board projection now matches the mature Home AI
  Growth board semantics more closely:
  - cancelled, retired, and superseded cards are hidden;
  - sequence groups show completed cards plus the first current uncompleted
    card, and later cards are reported as hidden future cards;
  - lanes use `ready`, `waiting_ai`, `needs_revision`, `reflection_required`,
    `locked_until`, and `completed_recent` rather than generic
    `active/waiting/completed`;
  - cards include legacy action/reward/sequence metadata needed by the copied
    Home AI Growth UI.
- Real-data smoke used a temporary copy of production Growth SQLite at
  `/tmp/homeai-growth-ui-parity/growth-learning.sqlite3` and did not write
  production data. `weixin_stephen` projected as 9 visible cards, 21 hidden
  future sequence cards, lanes `ready:2`, `needs_revision:5`,
  `completed_recent:2`, and no cancelled/retired/superseded visible cards.
- Local page smoke on `127.0.0.1:4898`/`4899` verified dark/large appearance,
  old Growth lane text `当前 / 待修订 / 最近完成`, and no horizontal overflow.
- Home AI embedded iOS visual harness passed against the local Home AI dev
  listener and this plugin code, screenshot:
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260610T095815Z.png`.
- Commit pushed:
  - `c914cf4c79ff` (`修复成长插件旧版看板投影`).
- Production deploy completed:
  - target: plugin `growth`;
  - deployed source ref: `c914cf4c79ff`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T101828Z-plugin-growth-growth-ui-parity`;
  - launchd label: `com.hermesmobile.plugin.growth`, running after deploy.
- Production board smoke passed for `weixin_stephen`:
  - `source=growth-plugin-sqlite`;
  - 9 visible cards;
  - 21 hidden future sequence cards;
  - lanes `ready:2`, `needs_revision:5`, `completed_recent:2`;
  - no cancelled/retired/superseded visible cards.
- Production Home AI embedded iOS visual harness passed with client version
  `20260610-growth-ui-parity-v683`; screenshot:
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260610T102523Z.png`.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - `node --test tests/growth-learning-sqlite-store.test.js`;
  - Home AI app-side static/plugin/visual/platform checks recorded in the app
    workspace handoff;
  - `git diff --check`.

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

## 2026-06-10 Growth Monthly Coin Clearing Deployed

- Product boundary:
  - completed cards have already produced Growth learning coin settlements;
  - monthly Growth-to-`通宝` exchange must use Growth coin balance/ledger, not
    completed-card state;
  - the Growth plugin owns the Growth-domain debit/clear record, while Home AI
    owns administrator authorization, exchange-rate policy, `通宝` ledger credit,
    and audit linkage.
- Growth plugin commit pushed:
  - `9f6985a` `feat: add growth monthly coin clearing`.
- Home AI docs commit pushed:
  - `a118d56` `docs: clarify growth monthly coin exchange`.
- Plugin implementation:
  - `learning_coin_ledger_entries` is created lazily in plugin-owned SQLite;
  - `learningCoinBalance` computes settled rewards plus ledger adjustments;
  - `clearLearningCoinBalanceForMonthlyExchange` writes an idempotent negative
    Growth learning-coin ledger entry when called with `write: true`;
  - dry-run mode returns clearable balance without writing a ledger row;
  - endpoints:
    `GET /api/v1/growth/learning-coins/balance` and
    `POST /api/v1/growth/learning-coins/monthly-exchange-clear`;
  - the clear path does not write platform `通宝` and does not mutate card
    status.
- Production deployment:
  - Growth plugin synced to
    `/Users/hermes-host/HermesMobile/plugins/growth`;
  - plugin deploy backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T061120Z-plugin-growth-growth-monthly-coin-clear`;
  - `com.hermesmobile.plugin.growth` restarted and running.
- Validation passed:
  - `npm run check`;
  - `npm test` with 43 passing tests;
  - production Growth status ok with `source=growth-plugin-sqlite`,
    `quick_check=ok`, and `foreign_key_issues=0`;
  - production non-mutating balance smoke for `weixin_stephen` returned
    `availableCoins=314`, `settledRewardCoins=314`, `adjustmentCoins=0`;
  - production dry-run clear returned `mode=dry_run` and `clearableCoins=314`;
  - production `learning_coin_ledger_entries` exists with `0` rows after smoke,
    so no real clear/debit was executed.
- Remaining boundary:
  - Home AI platform currency exchange bridge still needs administrator UI,
    exchange rules, platform `通宝` ledger credit, and audit linkage before real
    monthly exchange can be operated.

## 2026-06-10T06:27Z - Growth plugin card route launch staged

- Growth embedded frontend now accepts Home AI route hints:
  - `pluginRoute=card`;
  - `pluginItemId=<taskCardId>`;
  - compatibility aliases `route`, `itemId`, and `taskCardId`.
- When launched with `pluginRoute=card&pluginItemId=<taskCardId>`, the plugin
  loads the board and then opens the requested card detail.
- Contract boundary clarified:
  - Home AI converts legacy host links such as
    `view=learning&taskCardId=<taskCardId>` before launching the plugin;
  - the plugin only needs to honor the normalized plugin route parameters.
- Monthly exchange boundary remains:
  - card completion has already settled Growth coins;
  - monthly exchange reads Growth coin balance/ledger, credits platform
    `通宝` through Home AI administrator workflow, and then clears or deducts
    the Growth coin balance through the plugin clear route.
- Validation passed:
  - `npm run check`;
  - `npm test` with 44 passing tests, including routed card launch and monthly
    clear not depending on card state.
- Production deployment for this card-route launch change is pending from the
  Home AI app workspace after commits are pushed.

## 2026-06-10T06:30Z - Growth plugin card route deployed

- Growth plugin commit pushed and deployed:
  - `d169e5b` `fix: open routed growth cards`;
  - synced to `/Users/hermes-host/HermesMobile/plugins/growth`;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T062929Z-plugin-growth-growth-plugin-card-route`;
  - `com.hermesmobile.plugin.growth` restarted and running.
- Home AI companion commit pushed and deployed:
  - `53f79e3` `fix: route growth task links to plugin`;
  - production client version `20260610-growth-plugin-route-v681`.
- Production smoke passed:
  - Growth status for `weixin_stephen` returned
    `source=growth-plugin-sqlite`, `quick_check=ok`, and
    `foreign_key_issues=0`;
  - legacy Home AI URL
    `view=learning&workspaceId=weixin_stephen&taskCardId=ltask_623826dec47f15e5`
    launched the Growth plugin with `pluginRoute=card` and opened the card
    detail for `Short writing: a careful check changed my plan`.
- Remaining boundary:
  - routed card launch is production-active;
  - Home AI still owns legacy compatibility routing and remaining platform
    workflows such as Action Inbox/Web Push and future administrator
    Growth-coin-to-`通宝` exchange.

## 2026-06-10T07:25Z - Growth UI migrated as plugin-owned source

- The previous Home AI Growth UI has been copied into the Growth plugin as a
  plugin-owned migration baseline.
- Runtime frontend files are now plugin-local:
  - `public/growth-homeai-legacy.css`;
  - `public/growth-legacy-coins-ui.js`;
  - `public/growth-legacy-program-ui.js`;
  - `public/growth-legacy-task-ui.js`;
  - `public/growth-legacy-ui.js`;
  - `public/app.js` adapts plugin SQLite/facade data to the legacy UI shape.
- The Growth plugin must not import or mutate Home AI host frontend files at
  runtime. Future Growth UI changes should happen in this plugin workspace.
- The Home AI host remains responsible only for embedding/routing the Growth
  plugin and for still-unmigrated platform workflows documented elsewhere.
- Validation passed:
  - `npm run check`;
  - `npm test` with 44 passing tests;
  - direct plugin Playwright smoke on
    `http://127.0.0.1:4899/?workspaceId=weixin_stephen` loaded
    `growth-homeai-legacy.css`, `growth-legacy-*.js`, rendered the migrated
    board UI, and showed 48 Stephen cards with no frontend console errors;
  - `git diff --check`.
- Local Home AI dev iframe smoke on `127.0.0.1:18797` was blocked by current
  workspace grant config (`Workspace access is not allowed`) and should be
  repeated on production after deployment.

## 2026-06-10T07:23Z - Plugin-owned Growth UI deployed

- Commit pushed to `Education/main`:
  - `7a26cd7` `fix: make migrated growth UI plugin-owned`.
- Production deployment completed for plugin `growth` only:
  - synced to `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T072300Z-plugin-growth-manual`;
  - restarted `com.hermesmobile.plugin.growth`.
- Production health passed:
  - `GET http://127.0.0.1:4881/api/v1/growth/status?workspace_id=weixin_stephen`
    returned `stage=plugin_sqlite`, `source=growth-plugin-sqlite`,
    `quick_check=ok`, and `learning_task_cards=48`.
- Production direct plugin Playwright smoke passed:
  - `http://127.0.0.1:4881/?workspaceId=weixin_stephen`;
  - loaded plugin-local `growth-homeai-legacy.css` and
    `growth-legacy-*.js`;
  - rendered the migrated board UI with 48 Stephen cards and no frontend
    console errors.
- Unauthenticated Home AI host smoke reached the Access Key screen before any
  Growth iframe was rendered, which is expected without a browser login state.

## 2026-06-10T08:05Z - Owner-only Growth view switcher ready

- Added Owner-only learner/workspace switching inside the Growth plugin UI:
  - `GET /api/v1/growth/view-targets` returns all Growth-provisioned targets
    only when `x-hermes-plugin-actor-role=owner`;
  - workspace actor context receives only the current workspace target and
    cannot enumerate other Growth users;
  - board/card reads now fall back to the proxy
    `x-hermes-plugin-workspace-id` header when no query workspace is present;
  - the Growth board page renders a right-top menu for Owner context and
    switches by reloading plugin-owned status/board/card projections for the
    selected workspace.
- Home AI host companion change:
  - same-origin plugin proxy forwards only bounded actor headers:
    `x-hermes-plugin-actor-role=owner|workspace` and
    `x-hermes-plugin-actor-workspace-id`;
  - it does not pass broad workspace lists or secrets.
- Validation passed:
  - `npm run check`;
  - `npm test` with 47 passing tests;
  - `node --test tests/hermes-plugin-service.test.js tests/growth-routes.test.js tests/growth-service.test.js`;
  - direct Playwright smoke on a temporary local store/port `4898` proved Owner
    sees targets `weixin_stephen` and `owner`, can switch to owner, and
    workspace actor context shows no switcher;
  - `git diff --check`.
- Production deployment is pending until both Growth plugin and Home AI app
  companion commits are pushed.

## 2026-06-10T08:24Z - Owner-only Growth view switcher deployed

- Commit pushed to `Education/main`:
  - `c41499a` `feat: add owner growth view switching`.
- Production deployment completed for plugin `growth`:
  - synced to `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T075025Z-plugin-growth-manual`;
  - restarted `com.hermesmobile.plugin.growth`.
- Production validation passed:
  - direct plugin `GET /api/v1/growth/view-targets` with
    `x-hermes-plugin-actor-role=owner` returned switchable targets
    `weixin_stephen` and `owner`;
  - the same endpoint with `x-hermes-plugin-actor-role=workspace` returned
    only the current workspace target;
  - Home AI same-origin proxy
    `/api/hermes-plugins/growth/proxy/api/v1/growth/view-targets` forwarded
    Owner actor context and returned the same Owner switch targets.
- Boundary:
  - only Owner can enumerate and switch Growth learner views;
  - no enterprise/multi-workspace role support is implemented;
  - no broad workspace list or secret is forwarded from Home AI to plugins.

## 2026-06-10T10:53Z - Embedded Growth shell scroll owner ready

- Issue:
  - in Home AI embedded mode, Growth uses `body { overflow: hidden; }`;
  - without an explicit app-root scroll container, dragging inside Growth cards
    or lists can be swallowed by the non-scrollable body/iframe surface.
- Change:
  - `public/growth-homeai-legacy.css` now makes `.growth-shell` fill the iframe
    and own vertical scrolling with `overflow-y:auto`,
    `overscroll-behavior:contain`, `-webkit-overflow-scrolling:touch`, and
    `touch-action:pan-y`;
  - added `tests/growth-embedded-layout.test.js` to enforce that embedded
    layout contract.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-embedded-layout.test.js`;
  - Home AI local desktop iframe smoke through
    `http://127.0.0.1:18798/api/hermes-plugins/growth/proxy/...` confirmed
    `.growth-shell` is the hit target and scroll owner;
  - `git diff --check`.
- Deployment status:
  - not committed, not pushed, and not deployed yet.

## 2026-06-10T11:15Z - Growth task lane touch scroll deployed

- Issue:
  - production Owner/FanFan embedded Growth still felt frozen when trying to
    scroll through multiple task cards;
  - the prior `.growth-shell` root-scroll fix was insufficient because iOS/PWA
    iframe root scrolling can still be unreliable around interactive cards.
- Diagnosis:
  - production direct and Home AI embedded Playwright checks used
    `workspaceId=weixin_stephen`;
  - before this fix, the root shell could scroll programmatically, but the task
    board did not provide its own local scroll surface;
  - after injecting the local fix before deployment, the active task lane had
    `clientHeight=471`, `scrollHeight=1026`, and touchmove scrolled the lane
    without opening a card detail.
- Change:
  - `public/growth-homeai-legacy.css` now makes the Growth board page fill the
    iframe and makes `.learning-growth-board-lane.active` an explicit
    `overflow-y:auto` scroll container with iOS momentum scrolling and
    `touch-action:pan-y`;
  - `tests/growth-embedded-layout.test.js` now enforces the lane-scroll
    contract in addition to the root-scroll contract.
- Commit and deployment:
  - pushed to `Education/main`:
    `333f304` `fix: 修复成长任务列表触摸滚动`;
  - production deploy backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T111543Z-plugin-growth-growth-task-lane-scroll`;
  - restarted `com.hermesmobile.plugin.growth`, launchd state `running`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-embedded-layout.test.js`;
  - `npm test` with 50 passing tests;
  - Home AI deploy harness checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`, and
    `node tests/production-status-smoke-harness.test.js`;
  - production Growth CSS contains the board lane scroll rules;
  - production Home AI embedded iframe touch smoke for `weixin_stephen`
    reported active lane `overflow-y:auto`, `clientHeight=471`,
    `scrollHeight=1026`, touchmove `laneScrollTop=439`, and
    `detailOpen=false`.
