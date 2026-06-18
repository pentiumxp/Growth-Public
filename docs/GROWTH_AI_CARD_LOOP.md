# Growth AI Card Loop

Last updated: 2026-06-15.

## Purpose

This document defines the Growth-owned AI loop for generated learning cards.
The durable product goal is not isolated card completion. Growth should use
summary-only evidence from each card to update the learner profile, choose the
next graph target, and generate the next card with an explainable reason.

This is the card-level loop. The broader target architecture for long-running,
multi-subject, multi-workspace learning planning is defined in
`docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` and
`docs/GROWTH_LEARNING_OPERATING_LOOP.md`, and the implementation-ready slice
plan is in `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`. Future
planner, evidence-ledger, Profile V2, and profile-delta audit work should
extend this loop without moving card authoring, evaluation, or profile updates
out of the Growth plugin boundary.

The loop is:

1. read the learner profile, recent trajectory, recent experience signals, and
   relevant knowledge-graph nodes;
2. resolve the requested generation recipe, such as `daily_english_v1`;
3. choose a bounded next-card strategy and graph target;
4. create or accept a `learningGraphPlan`;
5. generate and validate a card through Gateway;
6. publish the card into Growth SQLite;
7. accept learner evidence and process one evaluation for daily cards;
8. record summary-only evaluation evidence;
9. write summary-only evidence ledger rows for evaluation, formal assessment,
   and later reflection/signal evidence;
10. update mastery/Profile V2 projections and experience signals;
11. project a bounded profile delta for Owner audit;
12. record a card trajectory row;
13. project the latest trajectory recommendation as the first candidate for
    the next generation, then fall back to recomputed profile strategy and graph
    suggestions;
14. after a trajectory recommendation successfully publishes a generated card,
    mark that recommendation `accepted` so later generations do not reuse the
    same pending recommendation;
15. if the Owner decides a pending recommendation should not be used, mark it
    `skipped` or `expired` through the Growth recommendation lifecycle service
    so the loop remains auditable without forcing a retry or generating a card.

The Owner generation surface must make the loop observable. It should show the
selected learner's bounded profile/trajectory projection, explicit
`nextCardRecommendation`, bounded `recommendationLifecycle`,
`targetProvisioning`, and `graphOptions` before generation so the Owner can
see whether the next card comes from a persisted trajectory recommendation,
recomputed profile strategy, graph suggestion, or selected provisioned domain
pack/subject. It must also distinguish planner Gateway readiness,
card-authoring Gateway readiness, and
card-evaluation Gateway readiness. Authoring Gateway readiness gates direct
card generation. Evaluation Gateway readiness is exposed as
`evaluationGatewayConfigured` and `aiLoopGatewayReady`; when it is false, the
card can still be authored, but the AI-driven loop is not
production-complete because evaluation will use the local fallback boundary.
Planner Gateway readiness is exposed separately and can be checked through the
no-write planner readiness smoke before the embedded planner UI is enabled.

## Ownership

Growth owns the whole learning loop inside the plugin boundary.

Home AI may provide the platform Gateway access/config boundary, plugin proxy,
workspace identity, and broad platform contracts. Growth must not call Home AI
old Growth route/server internals for card authoring, evaluation, profile
updates, trajectory, or next-card strategy.

## Model Boundaries

At the card level there are two model boundaries:

- card authoring: `learning-card-authoring-service` calls Gateway through
  `growth-gateway-authoring-client`;
- card evaluation: `learning-card-evaluation-service` calls Gateway through
  `growth-gateway-evaluation-client` when the evaluation Gateway endpoint is
  configured, and otherwise falls back to the deterministic local evaluator.

Deterministic evaluation may remain as a harness/local fallback boundary, but it
is not the final production pedagogy path. Gateway output must be parsed,
validated, bounded, and converted to service DTOs before any long-lived rows are
written.

Gateway is the only model boundary for Growth card evaluation. Growth may use
Home AI Gateway access/config, but it must not import Home AI old Growth server
internals or call model vendors directly.

The broader operating loop adds a third model boundary for planning through
`learning-plan-orchestrator-service` and `growth-gateway-planner-client`.
That planner boundary chooses the next objective and card role before card
authoring starts; it is documented in
`docs/GROWTH_LEARNING_OPERATING_LOOP.md`. Planner-backed formal checkpoint
items remain suggestions: `learning-plan-publisher-service` must not publish a
`stage_assessment` item directly, because formal assessment activation belongs
to `learning-stage-assessment-service`.

The Growth-owned operating-loop execution facade is
`learning-operating-loop-service`. It does not add a fourth model boundary.
It reads the current `growth.learningLoopState.v1` next action, delegates
daily-card creation to `learning-daily-loop-service`, delegates selected plan
publication to the same daily-loop service, and delegates formal checkpoint
activation only to `learning-stage-assessment-service` after explicit Owner
confirmation. Learner work, Owner audit/correction, target provisioning,
graph import/selection, and Gateway configuration remain separate flows and
must not be auto-completed by the facade.

Production-complete AI evaluation requires `GROWTH_GATEWAY_EVALUATION_ENDPOINT`
and its token/protocol settings in the Growth LaunchDaemon environment. The
deterministic evaluator is retained only for harness/local fallback and visible
failure isolation, not as the final pedagogy path for ordinary production
cards.

## Summary-Only Inputs

Card generation and evaluation planning may use:

- `learningGraphPlan`;
- knowledge-graph node source summaries;
- learner summary counts;
- mastery states for target or prerequisite nodes;
- recent card trajectory summaries;
- bounded experience signals;
- requested card role, difficulty band, support level, and evidence
  requirements.

They must not use:

- full learner answers outside the authenticated evaluation flow;
- full transcripts;
- full homework/source bodies;
- hidden answer keys;
- raw prompts;
- raw model responses;
- secrets, access tokens, cookies, push endpoints, or private file paths.

## First Implementation Slice

The first plugin-local implementation slice creates the profile/trajectory/
strategy service boundary and uses it for bounded default next-target
selection. Owner can still hand-pick a graph target, but if a daily generation
request omits `targetNodeId`, Growth selects the next target from the selected
learner's summary-only profile and next-card strategy before falling back to a
generic graph suggestion.

- `learning-mastery-profile-service`
  - turns persisted evaluation/reflection summaries into bounded mastery
    evidence;
  - updates `learning_growth_mastery_states` idempotently by source evidence;
  - records safe experience signals such as `not_learned`, `right_level`, and
    `challenge_ready`;
  - never writes raw answers, raw transcripts, raw prompts, or answer keys into
    long-lived profile rows.
- `learning-evidence-ledger-service`
  - writes first-class summary-only evidence rows in
    `learning_growth_evidence_ledger`;
  - records daily evaluation evidence with low weight and formal
    `stage_assessment` evidence with high weight;
  - records reflection and learner experience signal evidence through the same
    bounded contract;
  - rejects raw answers, transcripts, raw prompts, answer keys, raw model
    output, private paths, secrets, tokens, cookies, and provider config.
- `learning-experience-signal-service`
  - records learner-facing difficulty feedback (`too_easy`, `right_level`,
    `too_hard`, and `not_learned`) through the Growth-owned
    `POST /api/v1/growth/cards/:taskCardId/experience-signals` route;
  - requires graph target nodes from the card projection before writing;
  - writes `sourceType=learner_feedback` rows in
    `learning_growth_experience_signals`;
  - rejects raw answers, transcripts, prompts, answer keys, secrets, private
    paths, and provider configuration.
- `learning-card-trajectory-service`
  - writes one summary-only trajectory row per evaluated card and source
    evaluation;
  - stores target nodes, strategy, difficulty, strengths, remaining weaknesses,
    mastery changes, and a pending next recommendation;
  - stores recommendation lifecycle metadata such as `status`, source card id,
    source evaluation id, and bounded timestamps in `next_recommendation_json`;
  - is idempotent for the same card/evaluation source.
- `learning-card-recommendation-service`
  - reads the selected learner's summary-only profile projection;
  - promotes the latest pending persisted trajectory `nextRecommendation` into
    an explicit next-card recommendation before recomputing strategy;
  - treats legacy recommendations without a `status` as pending, and skips
    `accepted`, `skipped`, `expired`, and `superseded` recommendations;
  - exposes a service method for marking the selected trajectory
    recommendation accepted after generation publishes a card;
  - falls back to `learning-next-card-strategy-service` output when no
    trajectory recommendation is available;
  - never returns raw learner answers, transcripts, prompts, answer keys, raw
    model output, source refs, or private paths.
- `learning-recommendation-lifecycle-service`
  - reads persisted card trajectory recommendation lifecycle rows through the
    mastery-profile repository;
  - exposes summary-only pending/accepted/skipped/expired/superseded readback through
    `GET /api/v1/growth/recommendations/lifecycle` and
    `npm run smoke:recommendation-lifecycle`;
  - mirrors top-level `recommendationLifecycle*` smoke operator readback for
    operation/status, write gate, scope, filters, lifecycle counts, status
    counts, latest trajectory, pending trajectory ids, accepted generated-card
    ids, and write-performed flags while keeping the service DTO canonical;
  - exposes Owner-only `POST /api/v1/growth/recommendations/lifecycle/review`
    for explicit `skipped` or `expired` decisions on pending recommendations;
  - rejects attempts to mark recommendations accepted, overwrite accepted or
    superseded recommendations, or submit private keys/token-like values;
  - feeds release evidence as `productionRecommendationLifecycleSmokeEvidence`;
  - keeps the smoke CLI no-write; accepted-status writes remain owned by the
    card-generation publish path;
  - does not call Gateway, publish, generate, evaluate, schedule, notify,
    activate stage assessments, or mutate learner state outside the explicit
    lifecycle status row update.
- `learning-next-card-strategy-service`
  - reads mastery summary, recent trajectory, and experience signals;
  - chooses one bounded strategy from `repair`, `stabilize`, `transfer`,
    `stretch`, `integrate`, or `review`;
  - prefers prerequisite repair for repeated weak evidence and only stretches
    when confidence and stability are high.
- `learning-card-next-target-service`
  - reads the selected learner's explicit next-card recommendation, profile
    projection, or bounded history summary;
  - uses recommendation/strategy target nodes to choose an existing graph node
    for the next daily card when Owner did not hand-pick a target;
  - carries the selected recommendation id, status, and evidence basis through
    generation and delegates accepted-status writes after successful publish;
  - falls back to bounded graph suggestions only when no strategy target can be
    resolved;
  - never reads raw learner answers, transcripts, prompts, answer keys, or raw
    model output.
- `learning-card-generation-recipe-policy-service`
  - owns recipe defaults before generation, starting with `daily_english_v1`;
  - lets the Owner UI submit a compact daily recipe request instead of graph
    target, role, difficulty, evidence, and completion-policy internals;
  - supplies English domain/subject defaults, card schema version, and the
    `daily_score_once` policy while leaving graph target, role, and difficulty
    available for the recommendation/strategy selector.

## Owner Profile Projection Slice

The Owner-facing generation view reads profile state through
`learning-profile-projection-service`. This is a read projection over
`learning_growth_mastery_states`, `learning_growth_experience_signals`, and
`learning_growth_card_trajectories`.

The projection returns:

- bounded mastery states for target/prerequisite graph nodes;
- current strengths and weaknesses;
- recent experience signals;
- recent card trajectory rows;
- the next-card strategy and reason;
- `nextCardRecommendation`, including selection mode, recommendation mode,
  graph target, role, difficulty, and bounded reason;
- root-level `recommendationLifecycle`, derived from recent trajectory rows
  and limited to bounded ids, status, strategy, target node ids, short reason,
  generated card/plan ids, supersede id, and timestamps.

Profile V2 is now a separate backend projection in
`learning-profile-v2-service`. It reads the evidence ledger and returns
capability states, evidence weight totals, stale flags, strengths, weaknesses,
misconceptions, pressure signals, stage readiness hints, and planner hints.
`GET /api/v1/growth/card-generation/context` exposes an Owner-safe Profile V2
projection plus bounded evidence audit rows, `graphOptions`, and planner
readiness. `GET /api/v1/growth/evidence/audit` exposes the same persisted
evidence-ledger history as bounded public audit DTOs for visible targets and
history/drilldown screens. The existing embedded UI still primarily renders
the older profile/trajectory projection until the plan-preview/audit UI slice
is implemented.

The projection is target-workspace scoped. When Owner is viewing another
learner, Growth must use the selected learner workspace from
`GET /api/v1/growth/card-generation/context`, not the Owner workspace. The
projection is read-only and must not expose raw learner answers, transcripts,
prompts, answer keys, raw model output, private file paths, or internal source
refs.

Post-evaluation profile delta is now a backend audit projection owned by
`learning-profile-delta-service`. It compares bounded Profile V2 state before
and after an evaluation/evidence-ledger write, then returns only changed
graph-node states, evidence basis ids, planner hint changes, and bounded
summaries as `profile_delta` from `growth-evaluation-service`. It is
non-fatal: if the delta projection fails, Growth still keeps the
already-persisted evaluation, reward, ledger, stage-cycle, and trajectory
state, while exposing a bounded audit failure for Owner review.

Profile-delta audit persistence is implemented through
`profile-delta-audits.js` and `learning_growth_profile_delta_audits`.
`GET /api/v1/growth/profile-delta-audits` exposes bounded public readback for
visible targets. The Owner audit UI should read those persisted public
profile-delta DTOs, not recompute diffs in the browser from raw Profile V2
payloads.

Owner-reviewed profile correction is implemented as ledger evidence, not as a
mutable browser-side profile override. `learning-owner-correction-service`
accepts bounded Owner actions such as `mark_needs_repair`, `mark_stable`, or
`confirm_profile_delta`, validates target provisioning, and writes
`sourceType=owner_reviewed_correction` rows through
`learning-evidence-ledger-service`. `GET /api/v1/growth/profile-corrections`
returns grouped public correction DTOs for visible targets, and
`POST /api/v1/growth/profile-corrections` is Owner-only. Profile V2 absorbs
those correction rows as auditable state adjustments while keeping older
evaluation, stage-assessment, and feedback evidence visible by id/source type.
Correction payloads must remain summary-only and must not include raw learner
answers, transcripts, prompts, answer keys, raw model output, source-document
bodies, private paths, credentials, or provider configuration.

## Trajectory Recommendation Lifecycle

Trajectory recommendations are a lightweight queue stored inside the existing
`learning_growth_card_trajectories.next_recommendation_json` column. V1 does
not introduce a separate queue table.

Lifecycle rules:

- new recommendations written by `learning-card-trajectory-service` use
  `status: "pending"`;
- legacy recommendations with no status are treated as pending for backward
  compatibility;
- when a new pending recommendation is written for the same learner and
  program, older pending recommendations are marked `superseded`; accepted,
  skipped, expired, and already-superseded recommendations are not rewritten;
- `learning-card-recommendation-service` selects the latest pending
  recommendation that resolves to a known graph node;
- `learning-card-generation-service` marks the selected trajectory
  recommendation `accepted` only after authoring validates and the card
  publisher commits the generated task card and graph binding;
- accepted recommendations store only bounded ids and timestamps:
  `generatedTaskCardId`, `generatedLearningGraphPlanId`, `acceptedAt`,
  `statusUpdatedAt`, and `acceptedBy`;
- accepted, skipped, expired, and superseded recommendations are skipped by
  future recommendation projection;
- if the accepted-status write fails after publish, generation still returns
  the bounded `recommendationAcceptance` result so Owner review or a retry path
  can detect the lifecycle gap without corrupting the published card.

The lifecycle payload must remain summary-only. It must not contain raw
answers, transcripts, prompts, answer keys, raw Gateway output, private paths,
or provider configuration.

`learning-card-generation-context-service` projects the same lifecycle into
the Owner context as `recommendationLifecycle`. The embedded Owner generation
UI renders it as the "推荐闭环" panel and may call the Owner-only lifecycle
review route to mark a pending recommendation `skipped` or `expired`. The UI
constructs the review payload only from service-provided selectors, shows
submitting/reviewed/failed state, and refreshes the selected learner context
after success. It must not infer lifecycle state from raw trajectory JSON, mark
`accepted`, mutate `superseded`, publish/generate cards, call Gateway, evaluate
submissions, schedule work, or deliver notifications. Accepted and superseded
writes remain service-owned.

After a card publish succeeds, the embedded UI refreshes only the generation
context for the selected learner. It must preserve `status="published"` and
the generated card preview while replacing the summary-only context so the
Owner sees accepted/superseded lifecycle changes without a manual refresh.

## Strategy Rules

Strategy selection is deterministic and service-owned. Models may provide
diagnostic language, but they do not directly choose durable progression state.

Rules:

- repeated `too_hard`, `not_learned`, `confusing`, or low-score weak evidence
  selects `repair` or `stabilize`;
- stable high confidence and high score can select `stretch` or
  `challenge_ready`;
- completed ordinary daily cards with mixed evidence should usually select
  `stabilize`, not a formal assessment;
- missed days or low scores do not create backlog debt;
- stage assessment activation is a separate policy slice owned by
  `learning-stage-assessment-service`; ordinary next-card strategy can make a
  learner ready, but it does not directly publish formal assessments.

## Stage Assessment Loop

Formal stage assessment cards are generated only after a Growth-owned
activation decision. The loop is:

1. `learning-profile-projection-service` returns summary-only mastery,
   experience-signal, and trajectory context for the selected learner.
2. `learning-stage-assessment-service` evaluates eligibility over that
   projection and writes a cycle row through
   `stage-assessment-cycles`.
3. Eligible cycles remain separate from daily homework. Dormant and eligible
   cycles must not appear as overdue ordinary cards.
4. Activation can be system-owned, Owner manual, or learner
   `executor_challenge`.
5. Activation calls `learning-card-generation-service` with
   `cardRole=stage_assessment`, `stageAssessmentCycleId`,
   `activationState=active`, `activationReason`, `activationSource`, and
   assessment coverage node ids.
6. The authoring/publisher boundary writes the formal task card and graph
   binding. Stage assessment cards use `formal_assessment` metadata, default
   `300` Growth learning coins, and mastery evidence weight `1`.
7. When the formal evaluation is persisted, `growth-evaluation-service`
   delegates completion to `learning-stage-assessment-service`, which marks the
   active cycle `completed`, records `completedAt`, preserves the original
   cycle target and generated card id, and sets the next cooldown window.

Default V1 policy:

- at least 4 recent ordinary practice/teaching trajectory rows are required
  for system eligibility;
- a recent `too_hard`, `not_learned`, `confusing`,
  `needs_repair`, or `prerequisite_gap` signal blocks automatic eligibility;
- a recent `too_easy` or `challenge_ready` signal can mark a cycle ready;
- at least 5 days must pass after the latest completed formal assessment for
  the same capability cluster before non-Owner activation;
- Owner manual activation records `owner_manual` and can override cooldown;
- learner challenge activation records `executor_challenge`, is limited to the
  learner's own workspace, and respects cooldown.

## Evaluation-To-Profile Contract

When an evaluation is persisted:

1. evaluation remains the authoritative evidence record;
2. Growth derives bounded evidence items from evaluation status, score,
   confidence, `skillResults`, `remainingWeaknesses`, and graph-bound card
   nodes;
3. mastery evidence is weighted by card role: generated ordinary daily cards
   currently write low-weight evidence, while `stage_assessment` cards write
   formal evidence weight `1`;
4. formal assessment evidence covers the declared assessment coverage nodes,
   not only the first target node;
5. profile updates are idempotent by source evaluation id and target node, and
   repository writes merge legacy mastery rows by workspace, learner, program,
   and node before creating a new state row;
6. card trajectory is idempotent by task card id and source evaluation id;
7. reward settlement does not directly write mastery state; only the
   evaluation/reflection evidence boundary does;
8. profile, trajectory, and stage-assessment-cycle failures must be visible in
   service results but must
   not duplicate the evaluation or reward settlement.

For ordinary `daily_score_once` cards, a low score is feedback for the next
card. It must not reopen grading or force a pass-line retry.

## Evaluation Queue Recovery

The evaluation queue must be durable across plugin listener, app-server, and
Gateway restarts. A learner submission creates a durable
`learning_growth_evaluation_jobs` row before any model call. Queue workers claim
jobs with `leaseOwner` and `leaseUntil`; active leases are not stolen, but a
`processing` job whose lease has expired is eligible for the next worker to
claim.

Recovery rules:

- `pending` and due `retry` jobs are processed when `availableAt <= now`;
- `processing` jobs are skipped while `leaseUntil > now`;
- stale `processing` jobs become claimable after `leaseUntil <= now`;
- the new worker increments `attemptCount`, replaces the lease owner, and
  either completes the job or moves it to `retry`/`failed`;
- completion clears lease fields and reward settlement stays idempotent by the
  evaluation/source ids, so a restarted worker must not duplicate Growth coins.
- when a job reaches terminal `failed` without a persisted evaluation, card
  projection must surface `latestEvaluationJob.failedVisible`,
  `laneId=evaluation_failed`, and `primaryAction=owner_review` so the learner
  sees a recoverable state instead of hidden `waiting_feedback`.
- Owner recovery is an explicit plugin action. `POST
  /api/v1/growth/evaluations/owner-review` can retry only a terminal `failed`
  job after target visibility and Owner workspace authorization pass. The route
  delegates to `learning-evaluation-owner-review-service`, which writes bounded
  audit metadata and moves the saved job back to `retry`; it does not reopen the
  learner's submission or reflection, and it does not call Gateway directly.

Harness coverage:

- `tests/growth-learning-sqlite-evaluation-jobs.test.js` proves active leases
  are protected, stale processing leases can be reclaimed, and Owner retry
  writes bounded audit metadata for terminal failed jobs;
- `tests/growth-learning-sqlite-store.test.js` proves a stale processing job
  survives a simulated worker restart, resumes after lease expiry, completes
  the card, and settles rewards exactly once. The same store harness also
  proves exhausted evaluation failures project a visible card failure without
  reopening submission.
- `tests/learning-evaluation-owner-review-service.test.js` and
  `tests/growth-routes.test.js` prove Owner retry validation, Owner-only route
  authorization, visible target scoping, and service delegation.

## Gateway Evaluation Contract

Gateway-backed evaluation is a service boundary, not a route or store concern.

`learning-card-evaluation-service` owns:

- assembling bounded authenticated evaluation input;
- calling `growth-gateway-evaluation-client`;
- parsing the Gateway response into an evaluation draft;
- validating schema, target-node binding, card policy, and privacy;
- optionally asking Gateway to repair an invalid evaluation draft;
- returning the same bounded evaluator DTO shape used by
  `growth-evaluation-service`.

`growth-gateway-evaluation-client` supports two wire protocols:

- `generic`, the fake Gateway harness protocol that accepts
  `{ kind, input }`;
- `responses`, the official Gateway `/v1/responses` protocol selected by
  `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses` or inferred from an endpoint
  ending in `/v1/responses`.

The Gateway request kind for grading is `growth.card_evaluation.evaluate`.
Repair uses `growth.card_evaluation.repair`.

The authenticated evaluation input may include only bounded learner evidence
for the current submitted card, plus card policy and graph metadata:

- task card id, submission id, learner/workspace ids;
- `daily_score_once` policy and `passScoreRequired: false`;
- card role, learning target, evidence requirements, and target node ids;
- a bounded text answer excerpt and bounded audio metadata when present.

It must not include raw prompts, raw model output, hidden answer keys, full
transcripts, full homework/source bodies, secrets, tokens, cookies, push
endpoints, private file paths, or unrelated historical learner content.

Gateway output is an evaluation draft first. It is not persisted until
validation passes. The draft schema is `growth.card.evaluation.v1` and must
produce a bounded DTO containing:

- `status`, `score`, `maxScore`, `passed`, `confidence`, and `summary`;
- `feedbackSections`, `strengths`, and `remainingWeaknesses`;
- optional `skillResults` bound to graph target nodes;
- optional `evidenceRefs` and reward metadata.

Privacy and bounded-content scans reject raw answer/transcript/model-output
fields in the Gateway output. Invalid output fails visibly and leaves the
evaluation job retryable/failed according to the queue policy; it must not write
a partial `learning_evaluations` row.

## Harness Requirements

Focused harnesses must cover:

- end-to-end AI card loop flow where a generated daily card accepts learner
  evidence, records one evaluation, updates mastery/profile trajectory, projects
  a pending trajectory recommendation, generates the next card from that
  recommendation, and marks the consumed recommendation accepted after publish;
- profile update from one evaluation without raw answer leakage;
- idempotent replay of the same evaluation;
- weak evidence selects `repair` or `stabilize`;
- stable high-confidence evidence selects `stretch`;
- trajectory records the reason and next recommendation;
- trajectory recommendations are written as pending and are idempotent by
  source card/evaluation;
- recommendation projection prefers the latest pending trajectory next
  recommendation before recomputing a profile strategy;
- skipped, expired, accepted, and superseded trajectory recommendations are not
  reused as pending candidates, and generation marks the selected trajectory
  recommendation accepted after the published card commits;
- recipe policy accepts compact `daily_english_v1` generation input while
  keeping graph target, role, difficulty, and completion-policy internals in
  service-owned code;
- evaluation service writes profile and trajectory after evaluation/reward;
- evaluation service projects a bounded profile delta after ledger/profile
  updates and treats profile-delta failure as visible but non-fatal;
- profile-delta durable persistence is covered by repository/service/
  evaluation/AI-loop harness before Owner UI renders historical audit panels;
- profile/trajectory write failure does not duplicate evaluation or reward rows;
- card-generation context uses recommendation/strategy/profile output in its
  summary-only preview;
- card generation can create a plan from the learner profile strategy when
  Owner does not hand-pick a target node, and the published card remains bound
  to that strategy-selected graph node;
- learning profile projection returns bounded mastery, signal, trajectory, and
  next-card strategy fields without raw answer/source-ref leakage;
- Owner generation UI renders the selected learner's profile projection and
  explicit next-card recommendation reason without creating any write action;
- card-generation context exposes `authoringGatewayConfigured`,
  `evaluationGatewayConfigured`, and `aiLoopGatewayReady` separately, so Owner
  can see whether generation is possible and whether evaluation is also on the
  model-backed Gateway path;
- learner difficulty feedback writes through `learning-experience-signal-service`,
  rejects unanchored/private input, updates `learning_growth_experience_signals`,
  and refreshes the current card projection;
- stage assessment eligibility writes `learning_growth_stage_assessment_cycles`
  through `stage-assessment-cycles`;
- Owner manual activation generates a `stage_assessment` card with
  `stageAssessmentCycleId`, active activation metadata, `formal_assessment`
  policy, and default `300` coin reward metadata;
- stage assessment evaluation completion records formal evidence weight in the
  mastery profile, preserves summary-only evidence metadata, closes the active
  cycle, and projects cooldown on the next eligibility check;
- executor challenge activation can only target the executor's own workspace
  and does not generate during active cooldown;
- valid streaming response and valid JSON response from Gateway evaluation;
- invalid JSON, missing schema fields, privacy-risk output, and model timeout
  from Gateway evaluation;
- `growth-evaluation-service` using the injected Gateway evaluator before
  writing evaluation/profile/reward state.

The end-to-end service and route harness is
`tests/learning-card-ai-loop-harness.test.js`. It uses the real Growth SQLite
store, graph planning, card authoring, evidence write, evaluation, mastery,
trajectory, recommendation, next-target, and generation services with fake
Gateway authoring/evaluation boundaries. Evaluation goes through
`growth-gateway-evaluation-client` and `learning-card-evaluation-service`,
which parse and validate the fake Gateway draft before `growth-evaluation-service`
writes profile/reward/trajectory state. It also runs the HTTP route chain
through `POST /api/v1/growth/cards/generate`,
`POST /api/v1/growth/cards/:taskCardId/submissions`,
`POST /api/v1/growth/evaluations/process`, and a follow-up generation request
to prove route authorization and request normalization preserve the same
closed-loop service contract. The harness plants a raw-answer marker in
historical SQLite evidence and asserts the marker does not appear in Gateway
authoring input, Gateway evaluation input, profile projection, or trajectory
recommendation lifecycle payloads.

The same harness now includes a Fanfan science operating-loop scenario. That
scenario seeds summary-only science weakness evidence, drafts and persists a
planner plan, publishes the selected plan item through card generation, submits
learner evidence, evaluates through the Gateway evaluation service, records the
evidence ledger, and verifies Profile V2 recommends a repair strategy without
raw marker leakage.

## Production Evidence

The closed-loop service and route harness slice was deployed to Mac production
on 2026-06-14 through the central Home AI deploy script:

- Growth source commit: `4514a39c324a`.
- Production path: `/Users/hermes-host/HermesMobile/plugins/growth`.
- Backup:
  `/Users/hermes-host/HermesMobile/backups/deploy/20260614T082018Z-plugin-growth-growth-ai-card-closed-loop`.
- Deploy validation passed for `plugin:growth`: shared Codex auth ACL repair,
  Growth LaunchDaemon `launchd-print`, plugin manifest health, and
  `codex-auth-profile-audit` with `codexIssueCount=0`.
- Production read smokes passed:
  - `GET /api/v1/growth/status` returned plugin-owned SQLite status with
    `quick_check=ok`;
  - Owner `GET /api/v1/growth/view-targets` returned the sample learner target
    `weixin_stephen` labeled `凡凡`;
  - Owner `GET /api/v1/growth/card-generation/context?targetWorkspaceId=weixin_stephen`
    returned `ready=true`, KG `294` nodes / `329` edges, recipe
    `daily_english_v1`, and completion policy `daily_score_once` with
    `passScoreRequired=false`;
  - `GET /api/v1/growth/board?workspaceId=weixin_stephen` returned two ready
    cards and SQLite integrity `quick_check=ok`.
- Production visual smokes passed:
  - Home AI Playwright mobile smoke against
    `http://127.0.0.1:8797/?_hmv=growth-ai-loop-deploy`, client version
    `20260614-plugin-audit-v770`;
  - central iOS PWA `embedded-plugin-shell --plugin-id growth`, iframe
    `402x628`, no horizontal overflow;
  - central iOS PWA `dark-growth-surfaces`, 38 Growth surface samples, no pale
    solid backgrounds, no low-contrast semantic text, and stable bottom-nav
    samples.
- AI Ops evidence id: `evidence-8dbf71e4-1906-422a-b8df-b1c4cdfb93fd`.

The evaluation Gateway readiness slice was then deployed and configured on
2026-06-14:

- Home AI source commit: `8fce09e7ac3b`, deployed with backup
  `/Users/hermes-host/HermesMobile/backups/deploy/20260614T084515Z-home-ai-growth-evaluation-gateway-installer`;
- Growth source commit: `8d324234e76a`, deployed with backup
  `/Users/hermes-host/HermesMobile/backups/deploy/20260614T084538Z-plugin-growth-growth-evaluation-gateway-readiness`;
- Growth LaunchDaemon readback showed:
  - `GROWTH_GATEWAY_AUTHORING_ENDPOINT=http://127.0.0.1:18751/v1/responses`;
  - `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses`;
  - `GROWTH_GATEWAY_EVALUATION_ENDPOINT=http://127.0.0.1:18751/v1/responses`;
  - `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses`;
  - authoring and evaluation Gateway token paths set by file path only;
- Owner production card-generation context for `weixin_stephen` returned
  `ready=true`, `authoringGatewayConfigured=true`,
  `evaluationGatewayConfigured=true`, `aiLoopGatewayReady=true`, KG `294`
  nodes / `329` edges, and recipe `daily_english_v1`;
- a no-write production evaluation draft smoke against the real Gateway
  evaluation client passed after using a realistic task-card raw graph binding;
  the smoke returned `ok=true`, `gatewayMode=json`, score `85`, and
  `evidenceRefs=["growth-gateway-evaluation:v1"]`;
- central iOS PWA visual harness passed:
  - `embedded-plugin-shell --plugin-id growth`, screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260614T085055Z.png`;
  - `dark-growth-surfaces`, 38 samples, screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260614T085102Z.png`;
- AI Ops evidence id: `evidence-84963973-8f58-41a9-b96b-1e7202b96cc8`.

For the Fanfan computing/AI literacy card-generation path, production should
also pin authoring and planner Gateway calls to `GROWTH_GATEWAY_*_MODEL=gpt-5.5`
with `GROWTH_GATEWAY_*_REASONING_EFFORT=xhigh` so generated cards use the same
ChatGPT 5.5 / X high model posture available in Home AI chat.

Full production automation and broad visual UI controls for stage assessment
activation remain later slices.
