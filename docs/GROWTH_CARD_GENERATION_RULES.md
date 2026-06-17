# Growth Card Generation Rules

Last updated: 2026-06-17.

This document consolidates the current Growth card-generation rules from the
migrated Home AI Growth documents under `docs/home-ai-growth/`. It is the
plugin-local starting point for future card authoring work.

## Sources

- `docs/home-ai-growth/MODULES/growth-learning.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-flow.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-implementation.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-requirements.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-design.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-implementation.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/learning-mastery-profile.md`
- `docs/home-ai-growth/FANFAN_LEARNING_EVERGREEN_CARD_IMPLEMENTATION.zh-CN.md`
- `docs/GROWTH_AI_CARD_LOOP.md`

## Durable Product Rule

Ordinary Growth cards teach and practice before they test. Formal measurement
belongs to `stage_assessment` cards.

Daily ordinary cards are low-pressure learning cards. They should preserve the
existing Growth card UI shape, but they must not behave like pass/fail exams.
The daily-card completion policy is `daily_score_once`:

- the learner submits once;
- Growth runs one AI/deterministic evaluation only;
- the evaluation returns a score, strengths, and next-practice suggestions;
- the card completes after that one evaluation, regardless of whether the
  score is high or low;
- learning coins are calculated from the score and card reward cap;
- the reflection stage appears after evaluation and can be submitted once only;
- reflection is recorded as learning evidence and must not reopen grading,
  require a second reflection, or block completion;
- the UI contract stays compatible with the existing card renderer:
  `teachingFlow`, `latestSubmission`, `latestEvaluation`,
  `latestReflection`, `rewardPolicy`, `rewardState`, `laneId`,
  `nextAction`, and `primaryAction` remain the public fields.

The old assessment-first loop is reserved only for future explicit formal
assessment policy work and must not be used by daily cards:

1. learner submits;
2. AI evaluates;
3. learner revises and resubmits when needed;
4. AI evaluates again;
5. spoken reflection may be required;
6. completion and reward settlement happen only after all gates pass.

That flow should not be applied to ordinary daily cards.

Formal `stage_assessment` cards now use the implemented
`formal_assessment` policy instead of the old open-ended retry loop:

- exactly one formal submission;
- exactly one formal evaluation;
- exactly one formal reflection after evaluation;
- completion only after that formal reflection;
- high-weight mastery evidence across the declared coverage nodes;
- assessment-cycle cooldown after completion.

The formal flow is still separate from daily planning. Daily-loop draft/publish
must not directly publish a `stage_assessment`; activation belongs to
`learning-stage-assessment-service`.

## Learner Runtime Flow

Generated daily cards must be actionable from the Growth plugin UI without
Codex or manual database operations:

1. The learner opens the generated card in the existing Growth card detail.
2. The learner sees a single vertical workflow page, not a stepper-only page:
   status rail, score policy, learning target, lesson, worked example, guided
   practice instructions, submission, evaluation, reflection, and completion
   feedback are all in the same scrollable card detail.
3. The daily workflow has exactly three learner-facing stages: submit once,
   evaluate once, then reflect once. Each stage may expose at most one active
   text submission box; lesson and guided-practice sections must not add
   separate answer boxes.
4. The learner reads the lesson and guided-practice hints, then submits one
   final answer from the submission section.
5. The final answer can include text, audio, or both. Audio is optional and is
   stored only through plugin-owned evidence/audio routes.
6. After submission, the UI shows a saved-evidence state and either waits for
   the worker or offers a visible `刷新批改` action that calls the plugin
   evaluation processor.
7. The first completed evaluation is the card result. The UI shows the score,
   summary, strengths, weak points, and next-practice suggestions, but it must
   not ask the child to retry until a pass score is reached.
8. The learner can submit one reflection with text, audio, or both. Reflection
   is evidence only. It must not reopen grading, change the score, block
   completion, or require another reflection.

The plugin frontend must show visible errors for submission, evaluation refresh,
and reflection failures. A button press must not fail silently.

Difficulty feedback is a runtime signal, not a grading gate. Generated-card UI
may expose `too_easy`, `right_level`, and `too_hard` buttons only through the
Growth-owned signal path:

- `learning-experience-signal-service`;
- `POST /api/v1/growth/cards/:taskCardId/experience-signals`;
- `learning_growth_experience_signals`;
- graph-node anchored card projection via `targetNodeIds`.

The signal path must stay summary-only. It records learner difficulty feedback
as `sourceType=learner_feedback` and must reject raw answers, transcripts,
prompts, answer keys, secrets, private paths, or provider configuration. A card
without graph target nodes must show a disabled status instead of writing an
unanchored signal.

## Card Roles

| Role | Purpose | Completion policy | Evidence weight | Default reward | Duration |
| --- | --- | --- | --- | ---: | --- |
| `teaching` | Teach one focused concept or skill. | `teaching_check` | low | 100 coins | 10-15 minutes |
| `practice` | Reinforce recently taught material. | `practice_feedback` | medium | 100 coins | 10-15 minutes |
| `integration_practice` | Combine related recently taught concepts. | `practice_feedback` | medium | 100 coins | 10-15 minutes |
| `stage_assessment` | Formal independent mastery check. | `formal_assessment` | high | 300 coins | 25-30 minutes |

Backend reward policy may override coin defaults, but duration defaults are a
validated V1 product rule. Ordinary generated cards must validate
`expectedTimeMinutes` within 10-15 minutes and persist
`expected_duration_minutes_min=10` / `expected_duration_minutes_max=15`.
Stage assessment cards must validate `expectedTimeMinutes` within 25-30
minutes and persist `expected_duration_minutes_min=25` /
`expected_duration_minutes_max=30`.

Planner roles are broader than published card roles. Planner output may use
strategy roles such as `repair` or `stretch` to describe why the next card was
selected. Publication must map those roles into supported card-generation
roles before calling `learning-card-generation-service`. V1 uses:

- `repair` -> `teaching`, with lower difficulty and stronger support;
- `stretch` -> `practice`, with higher difficulty and transfer prompts.

The mapping belongs in `learning-plan-publisher-service` or a future dedicated
policy service. Routes and browser code must not implement their own role
mapping.

## Target Provisioning Rule

Owner visibility is not enough to generate a new card. Growth must pass a
learning target provision check before planner draft, plan publish, or direct
card generation for a learner/domain-pack/subject combination.

The rule is:

- `GET /api/v1/growth/view-targets` only answers whether the actor can see a
  learner target;
- `learning-target-provisioning-service` answers whether Growth can plan or
  generate cards for that target's selected domain pack, domain, subject, and
  graph nodes;
- the Fanfan sample can use `sample_default` while V1 is being brought up;
- non-sample learners require an active explicit provision before generation;
- route and browser code must not bypass this by passing `domainPackId`,
  `subject`, or `targetNodeId` directly into generation;
- provision DTOs and context projections must remain summary-only and must not
  expose raw graph JSON, source-document bodies, raw syllabus cache, learner
  answers, transcripts, prompts, answer keys, model output, private paths, or
  provider configuration.

## Model-Entered Steps

Growth card creation is fully AI-assisted only through Gateway. There are
three separate model-entered steps:

1. Planner: `learning-plan-orchestrator-service` sends Profile V2, graph
   candidate summaries, recent evidence summaries, constraints, and pressure
   policy to Gateway. It returns a plan draft, not a published card.
2. Authoring: `learning-card-authoring-service` sends a validated
   `learningGraphPlan` or validated planner item plus summary-only history and
   graph source summaries to Gateway. It returns an authoring draft, not a
   durable card.
3. Evaluation: `learning-card-evaluation-service` sends the current submitted
   evidence for the current card, bounded by the authenticated evaluation flow,
   plus card policy and graph metadata. It returns an evaluation draft, not a
   persisted grade.

Only the evaluation step may include the current learner answer because that is
the evidence being graded. Planning and authoring must not include raw
historical answers, raw transcripts, hidden answer keys, raw prompts, raw
model responses, private paths, secrets, or provider configuration.

Every model-entered step follows the same safety shape:

- assemble structured input in a Growth service;
- call Gateway through a Growth Gateway client;
- parse/repair the draft when policy allows;
- validate schema, graph binding, role policy, pressure policy, and privacy;
- write durable rows only after validation passes.

## Teaching And Practice Content

Model-authored ordinary cards must provide a structured `teachingFlow`:

- `learningTarget`;
- `prerequisites`;
- `microLesson`;
- `workedExample`;
- `guidedPractice`;
- `quickCheck`;
- `tooHardFallback`;
- `evidenceToRecord`;
- `difficultyBasis`;
- `supportLevel`.

Validation rules:

- teaching cards must include a lesson, worked example, guided practice, and
  quick check;
- quick checks must be answerable from the lesson and example;
- ordinary cards must not use formal assessment gates or exam wording;
- ordinary cards must fit within 10-15 minutes and the publisher must persist
  that expected duration range even when the model returns a single valid
  minute estimate such as `12`;
- if prerequisites are missing or uncertain, generate a teaching or repair
  card instead of a stage assessment;
- public projections must not expose hidden answer keys, raw prompts, raw model
  responses, full source content, full learner answers, or full transcripts.

Generated daily cards must include this completion policy in their published
card metadata:

```json
{
  "completionPolicy": {
    "mode": "daily_score_once",
    "evaluationAttempts": 1,
    "reflectionAttempts": 1,
    "completionAfter": "first_evaluation",
    "rewardMode": "score_proportional",
    "passScoreRequired": false
  }
}
```

For this policy, `needs_revision`, `draft_feedback`, and
`reflection_required` are not valid post-evaluation states. Feedback can name
focus areas, but the primary next step is review or next practice, not
resubmission.

Public board/detail projection must enforce the same low-pressure rule. Once a
`daily_score_once` card has a terminal evaluation record, the projected lane is
`completed_recent`, `nextAction` is `complete`, and the primary action is
review, even when the score is low or a legacy evaluator status says
`needs_revision`, `draft_feedback`, or `reflection_required`. Formal
`stage_assessment` cards are the exception: their `formal_assessment` policy
projects `reflection_required` after the first evaluation, allows exactly one
reflection, and projects completed/review only after that reflection is
recorded.

When `requireModel=true`, missing `teachingFlow` is invalid production output.
The system should fail closed, regenerate once with explicit validation
errors, fall back to a deterministic repair card, or require Owner review. It
must not silently publish a local split of old instruction text as if it were a
model-authored lesson.

## Authoring Ownership And Gateway Boundary

The Growth plugin owns card authoring. New card generation must be implemented
inside this plugin, for example through these service boundaries:

- `learning-card-authoring-service`;
- `growth-gateway-authoring-client`;
- `learning-card-authoring-validation-service`.

The authoring service is responsible for:

- assembling structured inputs;
- calling Gateway through the Growth Gateway authoring client;
- parsing and repairing model output when allowed;
- validating the authoring draft;
- writing accepted cards, required parent program/draft rows, graph bindings,
  and audit metadata to Growth SQLite in one transaction.

Home AI may provide the platform Gateway access/config boundary, but Growth
must not import or call Home AI old Growth route/server internals. The plugin
must not call model vendors directly. OpenAI, Claude, DeepSeek, or any other
provider-specific configuration, account, rate limit, audit, and stream
handling stays behind Gateway.

Gateway is the only model boundary for Growth card authoring.

The runtime authoring client supports two Gateway wire protocols:

- `generic`, the fake Gateway harness protocol that accepts
  `{ kind, input }`;
- `responses`, the official Gateway `/v1/responses` protocol. This mode is
  selected by `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses` or inferred when
  `GROWTH_GATEWAY_AUTHORING_ENDPOINT` ends in `/v1/responses`.

Production should configure `GROWTH_GATEWAY_AUTHORING_ENDPOINT` to a Gateway
Responses endpoint, set `GROWTH_GATEWAY_AUTHORING_MODEL` when the selected
worker requires an explicit model, and provide the Gateway access token through
`GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN_PATH` or the platform-managed secret
boundary. The model prompt is assembled inside Growth from summary-only
structured input; the browser never calls Gateway directly.

## Evaluation Ownership And Gateway Boundary

The Growth plugin also owns model-backed card evaluation. New grading behavior
must be implemented inside this plugin through these service boundaries:

- `learning-card-evaluation-service`;
- `growth-gateway-evaluation-client`;
- `growth-evaluation-service`.

Gateway is the only model boundary for Growth card evaluation.

`growth-evaluation-service` still owns queue claiming, record writing, reward
settlement, profile updates, trajectory recording, and bounded event emission.
It may call an injected evaluator, but it must not know model wire protocols.
`learning-card-evaluation-service` owns the model-facing evaluator boundary:
it assembles bounded authenticated evaluation input, calls
`growth-gateway-evaluation-client`, parses the result as an evaluation draft,
validates schema/graph/policy/privacy, and returns the bounded evaluator DTO.

The runtime evaluation client supports two Gateway wire protocols:

- `generic`, the fake Gateway harness protocol that accepts
  `{ kind, input }`;
- `responses`, the official Gateway `/v1/responses` protocol. This mode is
  selected by `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses` or inferred when
  `GROWTH_GATEWAY_EVALUATION_ENDPOINT` ends in `/v1/responses`.

Production should configure `GROWTH_GATEWAY_EVALUATION_ENDPOINT` to a Gateway
Responses endpoint, set `GROWTH_GATEWAY_EVALUATION_MODEL` when the selected
worker requires an explicit model, and provide the Gateway access token through
`GROWTH_GATEWAY_EVALUATION_ACCESS_TOKEN_PATH` or the platform-managed secret
boundary. If no evaluation endpoint is configured, Growth uses the
deterministic local evaluator as a fallback.

Evaluation Gateway input is allowed to include the current submitted answer
only because it is inside the authenticated evaluation flow. It must still be
bounded and structured:

- task card id, submission id, learner/workspace ids;
- `daily_score_once` policy with `passScoreRequired: false`;
- card role, learning target, target node ids, and evidence requirements;
- bounded learner text evidence and bounded audio metadata.

It must not include unrelated historical learner content, raw prompts, raw
model output, hidden answer keys, full transcripts, full homework/source
bodies, secrets, cookies, access keys, push endpoints, private file paths, or
model-provider configuration.

Gateway output must become an evaluation draft first. It must not be written
directly to `learning_evaluations`.

The required flow is:

1. collect Gateway output from SSE or JSON;
2. parse strict JSON;
3. run at most the configured repair pass when parsing or schema validation
   allows repair;
4. validate schema `growth.card.evaluation.v1`;
5. validate `daily_score_once` policy: one evaluation, no retry-until-pass;
6. validate `skillResults` against graph target nodes;
7. run privacy and bounded-content scans;
8. return a bounded evaluator DTO for `growth-evaluation-service`;
9. let the existing queue service transactionally write evaluation, reward,
   profile, trajectory, and events.

Failure behavior must be visible and must not create half-written evaluation
state:

- empty output is a bounded evaluation failure;
- invalid JSON after repair is a bounded evaluation failure;
- missing required schema fields after repair is a bounded evaluation failure;
- timeout is a bounded retryable failure when queue policy allows retry;
- privacy-risk output is rejected before persistence;
- repair pass failure does not write `learning_evaluations`.

## Structured Authoring Input

Authoring requests must be structured and summary-only. Required input families
are:

- `learningGraphPlan`;
- learner and mastery summary;
- recent experience signals;
- requested `cardRole`, difficulty band, and evidence requirements;
- versioned card schema;
- safe source summaries when needed.

Do not include raw long conversations, full homework bodies, full transcripts,
hidden answer keys, raw prompts, raw model responses, secrets, cookies, access
keys, push endpoints, or full private source content in card-authoring inputs.

## Draft, Validation, And Publish Flow

Gateway output must become an authoring draft first. It must not be written
directly as a published card.

The required flow is:

1. collect Gateway output from SSE or JSON;
2. parse strict JSON;
3. run at most the configured repair pass when parsing or schema validation
   allows repair;
4. validate the `teachingFlow` contract;
5. validate card-role policy;
6. validate graph plan and graph binding consistency;
7. run privacy and bounded-content scans;
8. transactionally write the parent program/draft rows required by the native
   SQLite schema, the card, graph binding, and audit metadata to Growth
   SQLite;
9. return a bounded published-card result.

Failure behavior must be visible and recoverable:

- empty output is a bounded authoring failure;
- invalid JSON after repair is a bounded authoring failure;
- missing required schema fields after repair is a bounded authoring failure;
- timeout is a bounded retryable failure when policy allows retry;
- validation failure can become retry, deterministic repair card, or Owner
  review;
- database transaction failure must roll back the generated parent rows, draft,
  graph binding, and card together, leaving no half-card.

## Graph And History Generation Runtime

The runnable generation path starts in `learning-card-generation-service`. It
creates or accepts a validated `learningGraphPlan`, reads knowledge-graph node
summaries, reads learner history through the `history-summary` SQLite
repository, and calls `learning-card-authoring-service` with one structured
summary-only request.

The service-owned runtime path is:

1. `learning-card-generation-recipe-policy-service` normalizes the requested
   recipe. For V1 ordinary daily cards, the browser can submit a compact
   recipe request (`daily_english_v1`, `daily_science_v1`, or
   `daily_subject_practice_v1`) with the target workspace, learner id, and
   selected domain/subject when the recipe is subject-scoped. The service
   supplies safe domain/subject defaults, card schema version, and the
   `daily_score_once` policy without forcing a graph target, role, or
   difficulty before learner profile/trajectory selection runs;
2. If Owner or caller supplied a target, `learning-graph-plan-service` uses
   that explicit graph target. If a daily generation request omits a target,
   `learning-card-next-target-service` first reads
   `learning-card-recommendation-service`. That service promotes the latest
   pending persisted trajectory `nextRecommendation` from the selected learner
   before falling back to the recomputed profile strategy. Legacy trajectory
   recommendations without a status are treated as pending. Accepted, skipped,
   expired, and superseded recommendations are ignored. When a new trajectory
   recommendation is written for the same learner/program, older pending
   recommendations are marked superseded so the selector cannot fall back to
   stale work after a newer recommendation is consumed. The first resolvable
   recommendation/strategy target node is used, and bounded graph suggestions
   are used only when no learner-specific target exists;
3. `learning-graph-plan-service` validates the selected target node,
   prerequisite path, card role, and assessment coverage;
4. `history-summary` reads bounded historical data from Growth SQLite:
   recent card status, evaluation summaries, mastery states, experience
   signals, recent trajectories, and aggregate counts;
5. `learning-profile-projection-service` prepares the selected learner's
   Owner-visible profile projection: mastery states, strengths, weaknesses,
   recent experience signals, recent trajectory, and next-card strategy reason;
   `learning-card-generation-context-service` also projects the selected
   summary-only `nextCardRecommendation` and bounded
   `recommendationLifecycle` so the Owner sees the same rationale and recent
   pending/accepted/superseded states that actual generation will use;
6. `learning-next-card-strategy-service` chooses or refreshes a bounded
   next-card strategy from profile, signals, and trajectory for the selected
   plan;
7. `learning-card-generation-service` combines graph source summaries and
   historical summaries without copying raw submissions, transcripts, prompts,
   answer keys, or model output into the Gateway request;
8. `learning-card-authoring-service` calls Gateway and validates the draft;
9. `card-authoring-publisher` writes the minimum FK parent rows in
   `learning_programs` and `learning_plan_drafts`, then writes
   `learning_task_cards` and `learning_card_graph_bindings` in one SQLite
   transaction;
10. if the generated card consumed a trajectory recommendation,
    `learning-card-generation-service` marks that recommendation `accepted`
    after the publish transaction succeeds. The accepted marker stores bounded
    ids and timestamps only, and future generation skips it.

The protected runtime endpoint is `POST /api/v1/growth/cards/generate`. It is
workspace-bearer scoped, normalizes snake_case and camelCase graph inputs, and
delegates generation to the service layer. The route must stay HTTP glue and
must not own recipe ids, daily completion policy, graph target selection,
role, or difficulty defaults.

Planner-backed generation can also enter through
`POST /api/v1/growth/learning-plans/:planDraftId/publish`. That route does
not author cards itself. It delegates to `learning-plan-publisher-service`,
which loads a validated `learning_growth_plan_drafts` row, maps planner
strategy roles into supported generation roles, calls
`learning-card-generation-service`, and marks the plan draft published only
after card generation succeeds.

When the embedded UI is served through the Home AI same-origin plugin proxy,
the host validates the Hermes workspace access and attaches the server-side
`.hermes-growth/access-key.txt` bearer to proxied write requests. Direct calls
to the plugin port still need the workspace bearer explicitly.

The current implementation supports generating a formal Growth card from the
imported knowledge graph and historical Growth SQLite summaries when a Gateway
authoring endpoint is configured. It does not direct-call model vendors and it
does not ask Home AI old Growth routes to author cards.

For ordinary daily cards, omitting `targetNodeId` is a supported profile-driven
generation path. It should use weak or stabilizing evidence from the selected
learner before generic graph suggestions. Formal `stage_assessment` generation
still requires explicit target and assessment coverage.

The Owner generation browser code should submit the compact daily recipe
request and let the backend fill graph-policy fields. It may show the selected
recommendation, graph target, role, and difficulty as a preview, but those
preview fields are not required inputs for ordinary daily card creation.

The Owner generation page may display `learningProfile`,
`profileV2`, `evidenceAudit`, `plannerReadiness`, `plannerContextPreview`,
`graphOptions`, `nextCardRecommendation`, and `recommendationLifecycle` before
generation. That display is a read-only target-workspace projection and must
remain summary-only. `GET /api/v1/growth/card-generation/context` accepts
bounded selectors such as `domain`, `subject`, `domainPackId`, `horizon`, and
`availableMinutes`; explicit selectors override recipe defaults for preview
and planner context, while recipe policy still supplies safe defaults.
`graphOptions` may show imported domain-pack ids, domains, titles, versions,
node counts, and subject labels, but not raw graph JSON or source materials.
The projection is allowed to show bounded weaknesses, strengths, signals,
evidence ids, recent trajectory, candidate graph nodes, selection mode,
recommendation mode, recommendation status, graph target, role, difficulty,
planner privacy flags, the next-card reason, generated card/plan ids,
superseded-by trajectory id, and lifecycle timestamps; it is not allowed to
show raw answers, transcripts, prompts, hidden answer keys, model output,
private file paths, source-document bodies, or internal source refs.

Planner-backed non-English daily cards should still enter through a validated
plan draft when the Owner is choosing a broader objective or sequence, not by
asking the browser to submit a free-form topic. The normal sequence is context
with `graphOptions`, draft plan, Owner preview, explicit publish, card
authoring, learner evidence, evaluation, ledger/Profile V2 update, and next
recommendation. Direct compact recipe generation is valid for
`daily_english_v1`, `daily_science_v1`, and `daily_subject_practice_v1` only
as a low-pressure daily-card shortcut; it still goes through target
provisioning, graph planning, graph evidence requirements, Gateway authoring,
validation, and transactional card publishing. Recipe defaults must not
override a selected graph node's evidence requirements.

## Gateway Response Modes

Gateway SSE is the preferred model path for authoring, but ordinary JSON
responses must be handled with the same aggregation and validation policy. A
valid non-stream JSON response must not become `invalid_json` simply because
the authoring client only collected SSE deltas.

Minimum fake Gateway harness scenarios for implementation:

- valid streaming response;
- valid JSON response;
- empty output;
- invalid JSON;
- model timeout;
- missing required card-schema fields;
- repair pass success;
- repair pass failure;
- privacy scan failure;
- graph binding validation failure;
- database transaction failure;
- FK-backed SQLite publish where `learning_programs` and
  `learning_plan_drafts` parent rows are missing and must be created in the
  same transaction.

## Graph-Guided Planning

New formal model-generated Growth cards should be generated from a validated
`learningGraphPlan` or a validated temporary graph node. The model must not
publish a formal card directly from a free-form topic prompt.

The plan declares:

- target graph node;
- prerequisite nodes;
- path nodes;
- card role sequence;
- evidence requirements;
- assessment coverage when applicable;
- source basis and privacy class.

Every new formal card should persist a graph binding:

- `learningGraphPlanId`;
- `cardRole`;
- `targetNodeIds`;
- `prerequisiteNodeIds`;
- `assessmentCoverageNodeIds`;
- `evidenceRequired`;
- `difficultyBand`.

Role-specific graph coverage:

- `teaching`: one focused target node unless the plan explicitly creates a
  bridge node;
- `practice`: one target node or a small adjacent set;
- `integration_practice`: two or more related nodes with an explicit
  integration reason;
- `stage_assessment`: one or more coverage nodes and an assessment objective.

Temporary graph nodes are allowed before a complete seed pack exists, but they
must still declare outcomes, prerequisites, evidence, domain, and summary-only
source basis.

## Experience Signals And Next-Card Strategy

Learner experience signals guide generation and scheduling. They are not
formal mastery failures by themselves.

Supported signal families:

- `too_easy`;
- `right_level`;
- `too_hard`;
- `not_learned`;
- `confusing`;
- `interesting`;
- `challenge_ready`;
- `completed`;
- legacy strategy context such as `repair`, `stabilize`, `transfer`,
  `stretch`, `integrate`, `review`, and `reflect`.

Rules:

- `too_hard`, `not_learned`, or `confusing` should queue prerequisite repair,
  easier teaching, or a different explanation lens;
- repeated friction should lower pressure before adding more assessments;
- missed days should not stack into backlog debt;
- `too_easy` can increase difficulty or assessment readiness;
- `right_level` reinforces the current difficulty band;
- `interest` can influence topic or format but must not override prerequisite
  gaps.
- learner-facing signal controls are clickable only when the card projection
  contains graph target nodes; unanchored legacy cards remain non-writable for
  difficulty feedback.

## Stage Assessment Activation

Stage assessments are evergreen formal cards. They can stay dormant until an
activation condition is met.

Activation paths:

- system eligibility from recent teaching/practice evidence through
  `learning-stage-assessment-service`;
- elapsed time or stale mastery evidence;
- Owner manual activation;
- executor challenge activation when cooldown and safety policy allow it;
- diagnostic repair when repeated `too_advanced` or prerequisite-gap signals
  indicate a formal check is useful.

Initial heuristic thresholds from the migrated design:

- at least 4 recent ordinary cards in the capability cluster;
- at least 5 days since the last completed formal assessment for the same
  cluster;
- no high-pressure signal in the recent window unless the activation reason is
  diagnostic repair;
- Owner manual activation records `owner_manual`;
- executor challenge activation records `executor_challenge` and keeps full
  stage-assessment reward/completion policy.

Dormant assessments should not appear as daily homework debt.

The Growth plugin owns the implementation boundary:

- `stage-assessment-cycles` writes and reads
  `learning_growth_stage_assessment_cycles`;
- `learning-stage-assessment-service` owns eligibility, cooldown, manual
  activation, learner challenge activation, and the handoff to card generation;
- `POST /api/v1/growth/stage-assessments/eligibility` evaluates readiness and
  records `dormant`, `eligible`, or `cooldown` state;
- `POST /api/v1/growth/stage-assessments/activate` is the Owner/manual or
  system activation boundary. `owner_manual` requires Owner role through the
  embedded proxy headers;
- `POST /api/v1/growth/stage-assessments/challenge` is the learner self-start
  boundary and can only target the executor's own workspace;
- activated formal cards are generated through
  `learning-card-generation-service`, not by a separate model path.

Activated cards must include:

- `cardRole=stage_assessment`;
- one or more `assessmentCoverageNodeIds`;
- `stageAssessmentCycleId`;
- `activationState=active`;
- `activationReason` such as `owner_manual`, `challenge_requested`, or
  `enough_recent_practice`;
- `activationSource` such as `owner_manual`, `executor_challenge`, or `system`;
- `formal_assessment` completion metadata;
- default `300` coin reward metadata and mastery evidence weight `1`.

When a formal assessment evaluation is persisted, it is a profile update
boundary as well as a card result. Growth must:

- record bounded summary-only mastery evidence for every declared assessment
  coverage node;
- apply the formal mastery evidence weight when updating
  `learning_growth_mastery_states`;
- preserve evidence metadata such as role, weight, source evaluation ref, and
  bounded weakness summaries without storing raw learner answers, transcripts,
  prompts, answer keys, or provider output;
- close the linked `learning_growth_stage_assessment_cycles` row and set the
  next cooldown window.

## Evergreen And Sequence Behavior

Evergreen sequences use `sequenceMode: "evergreen_jit"` and a stable
`sequenceGroupId`.

Sequence projection behavior:

- completed cards remain visible as completed history;
- the first uncompleted card in a sequence is current;
- later uncompleted cards are hidden future cards;
- future target shells should not keep pre-generated `teachingFlow`;
- only the current card should be JIT-authored at publish/activation time.

The FanFan IGCSE bridge pilot used this shape:

- 12 ordinary teaching/practice targets;
- first card current and JIT-authored through the publish path;
- future 11 cards as locked target shells;
- completion of the current card prepares the next target;
- after the 12th seed card, the evergreen policy allows a generated follow-up
  card.

Legacy original-board cards, old Knowledge Graph pilot cards, and old
evergreen cards are now regenerable runtime rows. They can be retired from the
board and regenerated from native Growth/KG planning instead of being preserved
as durable card assets.

## Privacy

Growth card generation, graph planning, mastery, runbooks, handoffs, logs, and
public projections must stay summary-only. Do not store or expose:

- raw learner answers except inside the specific authenticated evidence flow;
- full transcripts;
- hidden answer keys;
- raw prompts;
- raw model responses;
- full private source content;
- secrets, keys, cookies, tokens, or push endpoints.

## Current Plugin Boundary

The Growth plugin currently has native KG import, graph plan, card binding,
graph-plus-history generation, Gateway authoring, validation, and SQLite
publishing:

- `src/services/learning-card-generation-service.js`;
- `src/services/learning-card-recommendation-service.js`;
- `src/services/learning-card-next-target-service.js`;
- `src/services/learning-card-authoring-service.js`;
- `src/services/growth-gateway-authoring-client.js`;
- `src/services/learning-card-authoring-validation-service.js`;
- `src/stores/growth-learning-sqlite/history-summary.js`;
- `src/stores/growth-learning-sqlite/card-authoring-publisher.js`.

New plugin-owned generated cards use the protected
`POST /api/v1/growth/cards/generate` route or the same service directly. The
remaining architecture work is broader learner policy configuration,
stage-assessment expansion, Owner review/retry policy, and production Gateway
configuration validation.
