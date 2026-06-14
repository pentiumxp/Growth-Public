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
2. choose a bounded next-card strategy;
3. create or accept a `learningGraphPlan`;
4. generate and validate a card through Gateway;
5. publish the card into Growth SQLite;
6. accept learner evidence and process one evaluation for daily cards;
7. record summary-only evaluation evidence;
8. update mastery state and experience signals;
9. record a card trajectory row;
10. use the updated profile and trajectory for the next generation.

The Owner generation surface must make the loop observable. It should show the
selected learner's bounded profile/trajectory projection before generation so
the Owner can see why the next card is repair, stabilize, stretch, or review.

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
strategy service boundary without enabling fully automatic large-scale card
generation:

- `learning-mastery-profile-service`
  - turns persisted evaluation/reflection summaries into bounded mastery
    evidence;
  - updates `learning_growth_mastery_states` idempotently by source evidence;
  - records safe experience signals such as `not_learned`, `right_level`, and
    `challenge_ready`;
  - never writes raw answers, raw transcripts, raw prompts, or answer keys into
    long-lived profile rows.
- `learning-card-trajectory-service`
  - writes one summary-only trajectory row per evaluated card and source
    evaluation;
  - stores target nodes, strategy, difficulty, strengths, remaining weaknesses,
    mastery changes, and next recommendation;
  - is idempotent for the same card/evaluation source.
- `learning-next-card-strategy-service`
  - reads mastery summary, recent trajectory, and experience signals;
  - chooses one bounded strategy from `repair`, `stabilize`, `transfer`,
    `stretch`, `integrate`, or `review`;
  - prefers prerequisite repair for repeated weak evidence and only stretches
    when confidence and stability are high.

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
- the next-card strategy and reason.

The projection is target-workspace scoped. When Owner is viewing another
learner, Growth must use the selected learner workspace from
`GET /api/v1/growth/card-generation/context`, not the Owner workspace. The
projection is read-only and must not expose raw learner answers, transcripts,
prompts, answer keys, raw model output, private file paths, or internal source
refs.

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
- stage assessment activation remains a later policy slice and requires its own
  service/harness.

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
- evaluation service writes profile and trajectory after evaluation/reward;
- profile/trajectory write failure does not duplicate evaluation or reward rows;
- card-generation context uses strategy/profile output in its summary-only
  preview.
- learning profile projection returns bounded mastery, signal, trajectory, and
  next-card strategy fields without raw answer/source-ref leakage;
- Owner generation UI renders the selected learner's profile projection and
  next-card reason without creating any write action.
- valid streaming response and valid JSON response from Gateway evaluation;
- invalid JSON, missing schema fields, privacy-risk output, and model timeout
  from Gateway evaluation;
- `growth-evaluation-service` using the injected Gateway evaluator before
  writing evaluation/profile/reward state.

Full production automation and stage-assessment activation are explicitly
outside this first slice.
