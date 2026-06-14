# Growth AI Card Loop

Last updated: 2026-06-14.

## Purpose

This document defines the Growth-owned AI loop for generated learning cards.
The durable product goal is not isolated card completion. Growth should use
summary-only evidence from each card to update the learner profile, choose the
next graph target, and generate the next card with an explainable reason.

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
9. update mastery state and experience signals;
10. record a card trajectory row;
11. project the latest trajectory recommendation as the first candidate for
    the next generation, then fall back to recomputed profile strategy and graph
    suggestions;
12. after a trajectory recommendation successfully publishes a generated card,
    mark that recommendation `accepted` so later generations do not reuse the
    same pending recommendation.

The Owner generation surface must make the loop observable. It should show the
selected learner's bounded profile/trajectory projection and explicit
`nextCardRecommendation` before generation so the Owner can see whether the
next card comes from a persisted trajectory recommendation, recomputed profile
strategy, or graph suggestion.

## Ownership

Growth owns the whole learning loop inside the plugin boundary.

Home AI may provide the platform Gateway access/config boundary, plugin proxy,
workspace identity, and broad platform contracts. Growth must not call Home AI
old Growth route/server internals for card authoring, evaluation, profile
updates, trajectory, or next-card strategy.

## Model Boundaries

There are two model boundaries:

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
  graph target, role, difficulty, and bounded reason.

The projection is target-workspace scoped. When Owner is viewing another
learner, Growth must use the selected learner workspace from
`GET /api/v1/growth/card-generation/context`, not the Owner workspace. The
projection is read-only and must not expose raw learner answers, transcripts,
prompts, answer keys, raw model output, private file paths, or internal source
refs.

## Trajectory Recommendation Lifecycle

Trajectory recommendations are a lightweight queue stored inside the existing
`learning_growth_card_trajectories.next_recommendation_json` column. V1 does
not introduce a separate queue table.

Lifecycle rules:

- new recommendations written by `learning-card-trajectory-service` use
  `status: "pending"`;
- legacy recommendations with no status are treated as pending for backward
  compatibility;
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
3. profile updates are idempotent by source evaluation id and target node;
4. card trajectory is idempotent by task card id and source evaluation id;
5. reward settlement does not directly write mastery state; only the
   evaluation/reflection evidence boundary does;
6. profile and trajectory failures must be visible in service results but must
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

- profile update from one evaluation without raw answer leakage;
- idempotent replay of the same evaluation;
- weak evidence selects `repair` or `stabilize`;
- stable high-confidence evidence selects `stretch`;
- trajectory records the reason and next recommendation;
- trajectory recommendations are written as pending and are idempotent by
  source card/evaluation;
- recommendation projection prefers the latest pending trajectory next
  recommendation before recomputing a profile strategy;
- consumed trajectory recommendations are skipped, and generation marks the
  selected trajectory recommendation accepted after the published card commits;
- recipe policy accepts compact `daily_english_v1` generation input while
  keeping graph target, role, difficulty, and completion-policy internals in
  service-owned code;
- evaluation service writes profile and trajectory after evaluation/reward;
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
- learner difficulty feedback writes through `learning-experience-signal-service`,
  rejects unanchored/private input, updates `learning_growth_experience_signals`,
  and refreshes the current card projection;
- stage assessment eligibility writes `learning_growth_stage_assessment_cycles`
  through `stage-assessment-cycles`;
- Owner manual activation generates a `stage_assessment` card with
  `stageAssessmentCycleId`, active activation metadata, `formal_assessment`
  policy, and default `300` coin reward metadata;
- executor challenge activation can only target the executor's own workspace
  and does not generate during active cooldown;
- valid streaming response and valid JSON response from Gateway evaluation;
- invalid JSON, missing schema fields, privacy-risk output, and model timeout
  from Gateway evaluation;
- `growth-evaluation-service` using the injected Gateway evaluator before
  writing evaluation/profile/reward state.

Full production automation and broad visual UI controls for stage assessment
activation remain later slices.
