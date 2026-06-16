# Growth AI Learning Closed-Loop Plan

Last updated: 2026-06-16.

## Purpose

This document is the closed-loop contract for the Growth AI learning scheme.
Use `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` as the durable system scheme
before using this file for loop-specific product and implementation rules.

The detailed companion documents are:

- `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` for the product thesis,
  non-negotiable principles, Owner modes, automation maturity, implementation
  packages, and harness contract;
- `docs/GROWTH_LEARNING_OPERATING_LOOP.md` for the target architecture;
- `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` for implementation
  packages, immediate execution choice, and package-level definition of done;
- `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` for service, state,
  and implementation slices;
- `docs/GROWTH_AI_LEARNING_ROADMAP.md` for staged delivery and release gates;
- `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` for the current next-stage
  implementation choice, Fanfan science daily playbook, release-readiness
  semantics, and package definition of done;
- `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` for the supervised
  automation digest layer that must precede writeful scheduling;
- `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` for the
  default-disabled scheduler run/tick and future background worker contract;
- `docs/GROWTH_CARD_GENERATION_RULES.md` for card authoring and daily-card
  completion rules;
- `docs/GROWTH_CARD_INTERACTION_FLOW.md` for learner-facing card interaction.

Fanfan is the first operating target. The same loop must generalize to any
authorized learner workspace, domain pack, subject, and knowledge graph after
view-target visibility and learning-target provisioning both pass.

## Product Goal

Growth should become a supervised AI learning loop that compounds small,
auditable learning evidence over time.

The loop should repeatedly answer this question:

> Given the learner's current capability profile, evidence freshness, knowledge
> graph position, recent experience signals, pressure constraints, and Owner
> policy, what is the next low-pressure learning action, and how will its
> result update the profile?

The answer must be:

- AI-assisted through Gateway only;
- grounded in persisted bounded state, not transient prompt memory;
- validated before any durable write;
- auditable by Owner after completion;
- low-pressure for daily practice;
- conservative about mastery claims;
- extensible beyond Fanfan and beyond English.

## End-State Capability Definition

The target capability is not "generate more cards". The target capability is
an AI-assisted operating loop that can carry one learner from the current
profile state to the next justified learning action, then use the result of
that action to improve the next profile projection.

An end-state Growth loop must satisfy five conditions:

1. Persistent state is the source of truth. Profile V2, evidence ledger rows,
   plan drafts, card bindings, evaluation rows, profile-delta audits, Owner
   corrections, and recommendation lifecycle records must explain the next
   card without relying on Codex thread memory, hidden browser state, or raw
   model transcripts.
2. AI decisions are bounded. Gateway may plan, author, or evaluate, but every
   model response becomes a draft first and is validated before any durable
   write.
3. Daily learning stays low-pressure. Daily cards are short observations that
   compound over time. A low score lowers confidence or suggests repair; it
   does not create a retry-until-pass loop.
4. Formal assessment stays separate. Stage assessments are higher-weight
   profile checkpoints with explicit coverage, activation, and cooldown. They
   must not be silently created by the daily planner.
5. Owner can audit and correct. Owner must be able to see why Growth selected
   a card, which evidence supported it, what changed after completion, and how
   any correction was recorded as additive evidence.

The first concrete operating path is Fanfan plus the UK/HK curriculum
foundation graph. The architecture must still treat learner workspace,
learner id, domain pack, domain, subject, graph nodes, horizon, time budget,
and Owner policy as parameters so the same loop can later serve any authorized
workspace and knowledge domain.

## Closed Loop Contract

The complete learning cycle is:

1. Owner selects target learner, domain pack, subject, horizon, and time
   budget.
2. Growth verifies actor visibility and target/domain-pack provisioning.
3. Growth projects graph options, evidence audit, Profile V2, stale-evidence
   summaries, pressure signals, stage readiness, and Gateway readiness.
4. Gateway drafts a plan through the planner boundary.
5. Growth validates and stores the plan as an auditable draft.
6. Owner explicitly publishes one selected daily item, or uses the formal
   assessment controls UI for a checkpoint. The browser reads
   `growth.stageCheckpointControls.v1` and enables activation only from the
   `activate_stage_assessment` action.
7. Gateway authors the learner-facing card through the authoring boundary.
8. Learner completes one daily practice flow or one formal assessment flow.
9. Gateway evaluates current evidence once through the evaluation boundary.
10. Growth writes evaluation, reward, evidence ledger, profile, trajectory,
    recommendation lifecycle, and profile-delta audit records.
11. Owner can review the audit and add bounded correction evidence.
12. The next planner run uses the persisted profile and evidence.

The loop is complete only when the next recommendation can be explained from
durable summary-only records: plan draft, graph binding, generated card,
evaluation, evidence ledger, Profile V2, profile-delta audit, correction
history, trajectory, and recommendation lifecycle.

## Current Capability Versus Product Capability

Growth currently has two different levels of capability that should not be
confused:

| Capability | Current state | Product-complete requirement |
| --- | --- | --- |
| Direct daily card generation | The Owner `生成` tab can generate supported daily cards through the card-generation service and Gateway authoring boundary. | Keep this path as a compact recipe path, especially for `daily_english_v1`, while preserving `daily_score_once` and visible progress/failure states. |
| Planner-backed science path | Backend services and harnesses can run the Fanfan science vertical from plan draft through publication, learner evidence, evaluation, ledger, Profile V2, and profile-delta audit. | The embedded Owner UI must expose domain-pack/subject selection, plan preview, explicit publish, publish-attempt failure state, and audit refresh without Codex. |
| Learner card interaction | Generated daily cards support one submission, one evaluation, one optional reflection, audio evidence, and score-proportional completion. | The UI must keep at most one active text box per stage and must never require a pass-line retry for ordinary daily cards. |
| Audit readback | Backend read routes expose plan, evidence, profile-delta, correction, cycle audit, selectable cycle history, and completeness DTOs. | Owner UI must render those DTOs as an explanation surface, older-cycle selector, and correction entry point without exposing raw private content. |
| Supervised automation | Proposal creation, Owner decision, and accepted-proposal explicit publication are implemented as a non-scheduling backend layer. | Proposal review UI must exist before any scheduler; scheduling must start with read-only dry-run evidence and notification/action handoff design. |

This distinction is important for planning. Growth can already create certain
cards from the plugin UI, but the full AI-driven operating loop is not
product-complete until planner-backed generation, audit, correction, and
proposal review are browser-operable and visually validated.

## Implementation Priorities

The next implementation work should close the observable daily loop before
adding more automation:

1. Finish the Owner planner/provision UI for one Fanfan science daily card.
2. Render the audit and correction surface for completed cards.
3. Expose stage-checkpoint readiness and activation as a separate formal path.
4. Generalize target/domain-pack provisioning beyond the Fanfan sample.
5. Add supervised proposal review UI over the existing proposal backend.
6. Only then add supervised scheduler dry-runs, Owner-explicit execution,
   default-disabled scheduler runs, and later writeful scheduling.

Each step must ship with matching documentation and the smallest relevant
service, route, UI, architecture, privacy, and visual harness. A code-only
slice is not closed.

`docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` is the current execution selector:
use Path A for the product-visible Owner daily loop, or Path B only for a
backend release-readiness evidence boundary that cannot publish, schedule,
call Gateway, evaluate, activate stage assessments, or mutate learner state.

## Next Execution Package

The next product-visible package is the Owner-supervised daily browser loop.
It should make one Fanfan science or English daily card operable from the
Growth plugin UI without Codex, database-console work, or ad hoc scripts.

Required scope:

1. The Owner `生成` tab loads a selected visible target and shows the selected
   learner, domain pack, domain, subject, horizon, and time budget.
2. The UI renders bounded readiness from existing service DTOs:
   `targetProvisioning`, filtered `graphOptions`, Profile V2, evidence audit,
   plan audit, publish-attempt status, planner readiness, authoring readiness,
   and evaluation readiness.
3. Owner can create a draft through
   `POST /api/v1/growth/daily-loop/draft`, which delegates to the existing
   `learning-plan-publisher-service.draftPlan` boundary.
4. Owner can inspect one validated plan item with target nodes, role,
   difficulty, support level, evidence requirements, estimated minutes,
   rationale, and basis evidence ids.
5. Owner can explicitly publish one selected daily item through
   `POST /api/v1/growth/daily-loop/publish`, which delegates to the existing
   `learning-plan-publisher-service.publishPlanItem` boundary.
6. The UI shows visible progress for context loading, drafting, publishing,
   card opening, audit refresh, and failed/blocked publish attempts. No
   action may fail as a silent no-op.
7. The learner completes the generated card through the existing daily
   interaction flow: one submission, one evaluation, and one optional
   reflection.
8. After completion, Owner can refresh audit from the service-owned plan,
   evidence, profile-delta, correction, cycle-audit, and completeness DTOs.

Explicit non-goals for this package:

- no new model vendor boundary;
- no direct Gateway calls from routes or browser code;
- no new scheduler or background worker;
- no automatic publication after planning;
- no direct formal stage-assessment publication;
- no UI reconstruction of Profile V2 from raw rows;
- no raw learner answers, transcripts, raw prompts, raw model output, source
  document bodies, private paths, credentials, or provider configuration in
  Owner UI DTOs, screenshots, logs, or docs.

Acceptance requires:

- focused route and service tests for touched boundaries;
- frontend adapter/layout tests for progress state, visible errors, mobile
  scroll, and dark-mode contrast;
- docs-locality checks;
- broad local gate after implementation;
- central Home AI embedded-plugin visual harness before production UI release.

Backend facade status:

- `learning-daily-loop-service` now provides Owner-only backend preview,
  draft, and publish orchestration for the daily loop.
- `GET /api/v1/growth/daily-loop/preview` composes context plus optional cycle
  audit and completeness readback without writes.
- `POST /api/v1/growth/daily-loop/draft` composes context and plan draft
  creation without routes or browser code calling Gateway directly.
- `POST /api/v1/growth/daily-loop/publish` delegates publication to the plan
  publisher, strips generated authoring draft internals, and refreshes bounded
  cycle audit and completeness DTOs even when publication fails.
- The embedded UI still needs to consume this facade, show progress/error
  states, and pass frontend plus central visual harnesses before Stage 2 can
  be considered product-complete.

## Learning State Model

Profile V2 is the learner state projection used by the planner. It is not a
browser-side mutable object.

Profile V2 should summarize:

- graph-node capability state;
- evidence count, evidence weight, confidence, and score bands;
- separate freshness for daily evidence and formal assessment evidence;
- stale strengths that should become low-pressure review hints;
- weaknesses, misconceptions, uncertainty, and pressure signals;
- recent learner experience signals such as `too_hard`, `not_learned`, or
  fatigue-like difficulty feedback;
- Owner-reviewed correction evidence;
- planner hints for repair, stabilization, new-node introduction, review, or
  stage-checkpoint readiness.

Interpretation rules:

- unobserved graph nodes are unknown, not weak;
- one daily card can create a low-confidence observation but not a stable
  mastery claim by itself;
- repeated daily evidence can strengthen confidence gradually;
- formal stage assessments have higher weight because coverage, activation,
  and cooldown are explicit;
- Owner corrections adjust the projection as additive evidence and do not
  delete old evidence or refresh learner-evidence recency;
- stale evidence should lower confidence or trigger review instead of
  overstating mastery.

## Card Families

Growth uses two primary card families.

### Daily Practice Cards

Daily practice is routine learning, not an exam.

Rules:

- expected duration: 10-15 minutes;
- completion policy: `daily_score_once`;
- one learner submission;
- one evaluation;
- one optional reflection;
- completion after the first evaluation regardless of score;
- score-proportional reward;
- low or medium evidence weight;
- low scores become future planning evidence, not a retry-until-pass gate.

Daily planning can choose strategy roles such as `repair`, `stabilize`,
`practice`, `stretch`, or `review`, but publication must map them into
supported card-generation roles through a service-owned policy.

### Stage Assessment Cards

Stage assessments are formal checkpoints for stronger profile updates.

Rules:

- expected duration: 25-30 minutes;
- activation only through `learning-stage-assessment-service`;
- explicit coverage nodes;
- high evidence weight;
- completion and cooldown are owned by the stage-assessment service;
- planner may suggest a checkpoint, but direct publication as a daily card is
  forbidden.

Stage assessment should not be used to make ordinary daily learning feel like
high-stakes homework.

## Model Boundaries

Only three steps enter a model, and all three go through Gateway:

| Step | Growth service boundary | Input shape | Output shape | Write gate |
| --- | --- | --- | --- | --- |
| Plan | `learning-plan-orchestrator-service` and `growth-gateway-planner-client` | Profile V2 summary, evidence summaries, stale evidence, graph candidates, target provisioning, horizon, time budget, low-pressure constraints. | `growth.learningPlanDraft.v1`. | `learning-plan-validation-service`, then `learning-plan-publisher-service` persists the draft. |
| Author | `learning-card-authoring-service` and `growth-gateway-authoring-client` | Validated planner item or graph plan, graph/history/profile summaries, role, difficulty, support level, evidence requirements. | Versioned authoring draft with `teachingFlow`. | `learning-card-authoring-validation-service`, then `card-authoring-publisher` writes task card and graph binding transactionally. |
| Evaluate | `learning-card-evaluation-service` and `growth-gateway-evaluation-client` | Current authenticated learner evidence for the current card, bounded audio metadata, card policy, graph metadata. | `growth.card.evaluation.v1`. | Evaluation validation, then `growth-evaluation-service` writes evaluation and downstream records. |

Planning and authoring must not receive raw historical answers, full
transcripts, hidden answer keys, raw prompts, raw model output,
source-document bodies, private paths, secrets, tokens, cookies, or provider
configuration. Evaluation may receive only the current answer payload needed to
grade the current card.

Routes and browser code must never call Gateway directly.

## Service-First Architecture

Routes are HTTP glue. They parse requests, enforce authorization, resolve
visible targets, call services, and format bounded responses.

Business policy belongs in services:

- `learning-target-provisioning-service` owns target/domain-pack enablement;
- `learning-planner-context-service` owns planner input assembly;
- `learning-plan-orchestrator-service` owns Gateway planner draft calls;
- `learning-plan-validation-service` owns schema, graph, role, pressure, and
  privacy validation;
- `learning-plan-publisher-service` owns draft persistence and selected-item
  publication;
- `learning-card-generation-service` owns card generation orchestration;
- `learning-card-authoring-service` owns Gateway authoring;
- `growth-evaluation-service` owns evaluation queue processing and downstream
  writes;
- `learning-evidence-ledger-service` owns summary-only evidence rows;
- `learning-profile-v2-service` owns profile projection;
- `learning-profile-delta-service` owns post-evaluation profile-delta audit;
- `learning-owner-correction-service` owns Owner-reviewed correction evidence;
- `learning-cycle-audit-service` owns single-cycle audit aggregation;
- `learning-audit-completeness-service` owns read-only completeness checks over
  the public cycle-audit DTO before UI closure or future automation;
- `learning-stage-assessment-service` owns formal assessment policy.

Repositories own SQLite persistence and should not call services, read env
vars, or invoke Home AI platform APIs.

## Owner Experience

The first complete browser path is a Fanfan science daily card.

Default selectors:

| Selector | Default |
| --- | --- |
| Actor | Owner |
| Target learner | Fanfan visible Growth target |
| Learner id | `fanfan` |
| Domain pack | UK/HK curriculum foundation |
| Domain | `science` |
| Subject | `science` |
| Horizon | `daily_plan` |
| Available minutes | `15` |

Owner should be able to:

1. open the Growth `生成` tab;
2. select target and subject scope;
3. see target provisioning, graph options, Profile V2, evidence audit,
   planner readiness, authoring readiness, and evaluation readiness;
4. draft a plan;
5. inspect the validated plan preview;
6. explicitly publish one selected daily item;
7. open the generated card in the existing card detail;
8. let the learner complete one submission, one evaluation, and one optional
   reflection;
9. refresh audit and see why the card happened, what changed, and what Growth
   recommends next.

The UI must show visible progress and failure states. A button press must not
be a silent no-op. Mobile scroll, dark-mode contrast, and embedded sizing must
be validated with the central Home AI visual toolchain before production UI
deployment.

## Audit Requirements

Owner audit must answer:

- why this target node was selected now;
- which evidence, stale-evidence, profile, pressure, or stage-readiness
  signals supported the plan;
- which model boundaries ran;
- which durable records were written;
- what Profile V2 changed after evaluation;
- what remained uncertain or stale;
- whether Owner correction evidence exists;
- what the next recommendation is and why.

Audit DTOs are not raw transcript or prompt viewers. They must remain
summary-only and must not expose raw learner answers, full audio transcripts,
raw prompts, raw model output, source-document bodies, private paths,
credentials, or provider configuration.

Growth now exposes a single learning-cycle audit aggregate that composes
existing service readbacks for one card, evaluation, or plan draft:

- plan audit;
- evidence audit;
- profile-delta audit;
- Owner correction audit;
- generated card and graph-binding identifiers when available;
- bounded timeline of plan, author, submit, evaluate, project, correct, and
  recommend events.

The aggregate is implemented by `learning-cycle-audit-service` and
`GET /api/v1/growth/learning-cycles/audit`. It composes existing audit
services instead of reading SQLite tables directly from the route.

Growth also exposes selectable historical-cycle readback for Owner history
controls. `learning-cycle-history-service` composes public plan-audit,
evidence-audit, profile-delta-audit, Owner correction, and optional
audit-completeness DTOs into bounded `growth.learningCycleHistory.v1` rows.
The route is `GET /api/v1/growth/learning-cycles/history`, and the no-write
operational smoke is `npm run smoke:cycle-history`. This boundary is for
selection/readback only; it does not write durable state, call Gateway, publish
plans, generate cards, evaluate submissions, or schedule work.

Growth also exposes a read-only audit-completeness check for the same cycle.
`learning-audit-completeness-service` reads only the public cycle-audit DTO and
reports whether required audit evidence is present:

- plan publication or a visible failed/blocked publish attempt;
- evaluation evidence in the evidence ledger;
- persisted or visibly failed profile-delta audit;
- downstream partial failures;
- privacy projection status, checked as risk-bearing public DTO keys rather
  than arbitrary text-value keywords;
- optional Owner correction and next-recommendation visibility.

The route is `GET /api/v1/growth/learning-cycles/completeness`. It does not
write durable state, does not call Gateway, and does not start scheduling. A
future scheduler may use `readyForAutomation=true` only as one prerequisite,
not as permission to bypass Owner policy.

## Supervised Automation Proposal Layer

Automation starts as an Owner-reviewed proposal, not as a scheduler.

The first automation layer should answer:

> Given a previous completed and auditable learning cycle, what should Growth
> propose next, and what still requires Owner action before any card is
> published?

Required behavior:

1. The request must identify a previous source cycle through at least one
   bounded id such as plan draft, task card, evaluation, profile delta,
   evidence, correction, or source id.
2. Growth must evaluate audit completeness for that source cycle before any
   new plan draft is requested.
3. If completeness is missing or privacy projection is uncertain, the proposal
   fails closed and no new plan draft is created.
4. Growth must verify target visibility and learning-target provisioning for
   the requested learner, domain pack, domain, subject, and target nodes.
5. Growth may draft a new plan only through `learning-plan-publisher-service`
   and the existing planner boundary.
6. Growth persists a summary-only proposal record that links source cycle,
   new plan draft, selected plan item, target nodes, rationale, and Owner
   policy.
7. Owner can record a bounded decision on the proposal: `accepted`, `skipped`,
   `expired`, or `superseded`.
8. An accepted proposal returns an explicit Owner publish action, but it does not
   publish the card.
9. Owner can explicitly publish an accepted proposal through the proposal
   publish route. This delegates to the plan publisher and records bounded
   proposal execution metadata.

The proposal boundary is:

| Boundary | Contract |
| --- | --- |
| Service | `learning-automation-proposal-service` composes audit completeness, target provisioning, plan draft creation, Owner decision, and accepted-proposal publish execution through the plan publisher. |
| Repository | `learning_growth_automation_proposals` stores summary-only proposal, decision, and execution metadata. |
| Read route | `GET /api/v1/growth/automation/proposals` lists proposals after Growth visible-target read authorization. |
| Write route | `POST /api/v1/growth/automation/proposals` is Owner-only, workspace-bearer authorized, and visible-target scoped. |
| Decision route | `POST /api/v1/growth/automation/proposals/:proposalId/decision` records Owner proposal status without publishing cards. |
| Publish route | `POST /api/v1/growth/automation/proposals/:proposalId/publish` is Owner-only, requires an accepted proposal, delegates to `learning-plan-publisher-service.publishPlanItem`, and records bounded execution metadata. Existing `POST /api/v1/growth/learning-plans/:planDraftId/publish` remains the direct plan-publish route. |

This layer must not:

- call `learning-card-generation-service` directly;
- call Gateway directly;
- call model vendors directly;
- publish cards during proposal creation or Owner decision;
- activate formal stage assessments;
- start background scheduling;
- treat `readyForAutomation=true` as permission to bypass Owner review.

The only model-entered step inside proposal creation is the existing planner
draft boundary. Proposal creation must not enter authoring or evaluation model
boundaries.

## Scheduler Dry-Run Layer

The first scheduling layer is implemented as read-only dry-run evidence. It is
not a background worker and does not publish cards.

Boundary:

| Boundary | Contract |
| --- | --- |
| Service | `learning-automation-scheduler-service` lists accepted proposals, rechecks source-cycle audit completeness, rechecks target provisioning, and returns candidate actions. |
| Route | Owner-only `POST /api/v1/growth/automation/scheduler/dry-run` with workspace bearer authorization and Growth visible-target scope. |
| Inputs | target workspace, learner id, program id, optional plan-draft filter, domain-pack/domain/subject selectors, target nodes, and bounded limit. |
| Outputs | `dryRun=true`, `writePlanned=false`, `writesPerformed=false`, `publishPlanned=false`, summary counts, and bounded candidates. |

Candidate decisions include:

- `would_publish`: accepted proposal is still auditable and provisioned;
- `blocked_audit`: source cycle no longer passes audit-completeness checks;
- `blocked_provisioning`: target/domain-pack/subject/node provisioning fails;
- `skipped_already_published`: accepted proposal has already published;
- `skipped_not_accepted`: a non-accepted proposal was supplied by a caller or
  future repository variant and remains ignored.

Forbidden behavior:

- no Gateway calls;
- no plan publication;
- no card generation or authoring;
- no evaluation;
- no proposal execution writes;
- no notification or Action Inbox handoff;
- no stage-assessment activation;
- no direct SQLite table access from the route or scheduler service.

Writeful scheduling remains future work and requires active rollback/failure
policy, notification/action handoff, Owner digest UI, and their own harness.

## Supervised Automation Digest Gate

The automation digest layer is the required review packet between the
implemented scheduler dry-run and any future writeful scheduler. Its detailed
contract is in `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`.

Purpose:

- persist a summary-only digest of scheduler dry-run candidates;
- show which accepted proposals would publish if Owner takes an explicit
  publish action;
- show blocked audit/provisioning/skipped candidates and retry hints;
- keep Owner review separate from execution;
- provide auditable evidence before any notification or scheduling handoff.

Implemented backend boundary:

| Boundary | Contract |
| --- | --- |
| Service | `learning-automation-digest-service` composes scheduler dry-run, proposal readback, audit completeness, target provisioning, and bounded audit read services. |
| Repository | `learning_growth_automation_digests` stores summary-only digest, candidate, blocked, required-action, and optional review metadata. |
| Routes | `GET /api/v1/growth/automation/digests`, `POST /api/v1/growth/automation/digests`, and `POST /api/v1/growth/automation/digests/:digestId/review` remain Owner/visible-target scoped and never publish. |

The digest layer must not call Gateway, plan publication, card generation,
proposal publish execution, notifications, Action Inbox, stage-assessment
activation, or a background worker. Digest review records that Owner reviewed
the packet; it does not authorize automatic execution by itself.

The rollback/failure policy backend is implemented through
`learning-automation-failure-policy-service`,
`automation-failure-policies.js`, and
`/api/v1/growth/automation/failure-policies` routes. It only reports an
active policy as a prerequisite and always keeps `writefulSchedulingAllowed`
false. The automation action handoff backend is implemented through
`learning-automation-action-handoff-service`,
`automation-action-handoffs.js`, `learning_growth_automation_action_handoffs`,
and `/api/v1/growth/automation/action-handoffs` routes. It creates bounded
handoff records only after reviewed digest and active failure-policy gates,
emits `growth.automation.action_required` through `growth-event-service`, and
records delivery success or visible delivery failure without publishing or
mutating learner state.

The default-disabled Owner-explicit scheduler execution backend is implemented
through `learning-automation-scheduler-execution-service`,
`automation-scheduler-executions.js`,
`learning_growth_automation_scheduler_executions`,
`GET /api/v1/growth/automation/scheduler/executions`, and Owner-only
`POST /api/v1/growth/automation/scheduler/execute-once`. It records blocked
state while `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED` is false. When
enabled, it rechecks delivered handoff, reviewed digest, active failure-policy
readiness, and matching scheduler dry-run before delegating only to accepted
proposal publication. This is not background scheduling. Background writeful
scheduling remains blocked until Owner daily UI, audit/correction UI, proposal
review UI, digest/action/execution UI, platform action UI or Action Inbox/Web
Push evidence, central visual evidence, and explicit release evidence are all
implemented and covered by harness.

## Generalization Rule

Fanfan is the first sample target, not a hard-coded architecture boundary.

For any non-sample learner:

- actor workspace and target learner workspace must stay separate;
- `view-targets` must authorize visibility;
- target/domain-pack/subject provisioning must be active before planning,
  authoring, direct generation, or correction writes;
- graph nodes must belong to the selected provisioned graph context;
- profile, evidence, plan, card, and audit rows must be written under the
  target learner workspace;
- public projections must not mix Owner actor data into learner state.

## Failure Policy

Growth should fail closed and visibly:

- invalid model output does not create a draft/card/evaluation;
- validation failure returns a bounded error and does not write partial state;
- failed or policy-blocked plan publication does not mark the plan as
  published; it records bounded latest `publishAttempt` metadata for Owner
  audit;
- automation proposal failure does not publish a card, does not start a
  scheduler, and should leave either no proposal row or a bounded failed
  response that Owner can retry after fixing the missing audit/provisioning
  condition;
- accepted proposal publish execution failure records bounded execution
  metadata and leaves the failure visible for explicit Owner retry;
- DB transaction failure rolls back the affected write;
- evaluation retry exhaustion projects a visible `evaluation_failed` state;
- profile, trajectory, or profile-delta downstream failure is visible but must
  not duplicate already-persisted evaluation/reward/evidence rows;
- production UI actions must show progress and bounded failure messages.

## Implementation Stages

| Stage | Goal | Completion signal |
| --- | --- | --- |
| S0: Backend foundation | Services can run planner, authoring, evaluation, evidence, Profile V2, and audit with fake or configured Gateway clients. | Service, route, architecture, AI-boundary, docs-locality, and full local harnesses pass. |
| S1: Learning-cycle audit aggregate | Owner can read one card/evaluation/plan cycle as a single service-owned audit DTO, select older cycles from bounded history, and check whether required audit evidence is present before UI closure or later automation. | Implemented locally through `learning-cycle-audit-service`, `learning-cycle-history-service`, `learning-audit-completeness-service`, visible-target route tests, plan publish-attempt audit tests, privacy-stripping service tests, cycle-history smoke tests, and architecture guard coverage. |
| S2: Owner-supervised daily UI | Owner can create one Fanfan science daily card from the Growth UI without Codex. | UI, progress/error, mobile scroll, dark mode, central visual harness, and planner readiness smoke pass. |
| S3: Closed audit UI | Owner can inspect plan basis, evidence, profile delta, corrections, and next recommendation after completion. | Audit UI tests, privacy tests, route tests, and visual evidence pass. |
| S4: Stage-checkpoint UI | Owner can activate formal checkpoints separately from daily practice. | Implemented locally through controls DTO rendering, controls-action gating, stage readiness/cooldown tests, no-direct-formal-publish tests, frontend adapter tests, layout guards, and architecture guards. Production visual evidence is still required before release. |
| S5: Multi-workspace/domain-pack rollout | Any visible and provisioned learner/domain pack can run the same loop. | Cross-workspace allow/deny, provisioned target, target-switch UI, and no-data-mixing tests pass. |
| S6: Supervised automation proposal | Growth can create, Owner-review, and explicitly publish an accepted next-learning proposal from a completed auditable cycle without starting a scheduler. | Proposal repository/service/route tests prove summary-only persistence, idempotent save, Owner decision status, accepted-only publish execution, bounded execution metadata, audit-completeness gating, target provisioning, privacy rejection, no direct Gateway/card-generation calls, and Owner-only write policy. |
| S7: Owner-explicit scheduler execution | Growth can execute one delivered, reviewed, accepted proposal only through an Owner action and only when the default-disabled writeful gate is explicitly enabled. | Read-only scheduler dry-run, digest backend, rollback/failure policy backend, action handoff backend, and default-disabled scheduler execution backend are implemented locally; production enablement still requires execution UI, platform action UI or Action Inbox/Web Push evidence, production dry-run evidence, and visual/release evidence. |
| S8: Background scheduler contract | Growth can record one supervised scheduler tick, review persistent worker targets, and exercise a default-disabled worker lease boundary without enabling production unattended scheduling. | Scheduler run service/repository/route harnesses prove disabled-config blocking, delivered-handoff candidate handling, delegation only to execution, bounded run state, privacy rejection, and no direct Gateway/card-generation/direct-plan-publish/stage-activation/table access. Worker target repository/service/route harnesses prove provisioning checks, proposed/enabled/disabled/archived review states, summary-only persistence, visible-target read, Owner-only writes, and no scheduler/model/publication calls. Worker lease repository/service/HTTP-glue harnesses prove default-disabled timer behavior, reviewed-target preference before local env fallback, active lease protection, stale lease reclaim, and scheduler-run-service-only delegation. Production background scheduling remains disabled until platform, visual, dry-run, reviewed enabled target config, and release evidence exist. |
| S9: Release-readiness evidence | Growth can summarize product, platform, visual, stage-checkpoint smoke, production proposal smoke, production cycle-history smoke, production Owner audit smoke, production profile-feedback smoke, production controlled daily-loop write smoke, production learner-cycle audit smoke, production dry-run, reviewed-target, config, explicit release evidence, release evidence bundle self-audit, source-bundle evidence readback, release collection-run evidence, release package artifacts, persisted package audit records, package-record review readback, and Owner release-decision evidence before any production scheduling decision. | Release-readiness, release collection-run, release package, release review, release authorization, release closure, release controls, release dashboard, and release decision service/repository/route/script harnesses prove summary-only snapshots/runs/packages/decisions, missing/blocked/all-pass checks, package-record advisory readback (`packageRecordStatus`, `latestPackage`, `packageReadback`, latest-package dashboard summary fields), remediation plan fields (`missingCheckKeys`, `blockedCheckKeys`, `missingEvidenceKeys`, `requiredActions`, `nextAction`), persisted `evidenceReadback` catalog coverage in `evidence_readback_json`, privacy rejection, visible-target scope, Owner-only snapshot/run/decision writes, release evidence bundle ingestion, release evidence bundle audit evidence, collection-run persistence from sanitized bundle/audit/readiness artifacts, release package composition from bundle/audit/readiness/collection-run/controls/dashboard artifacts, package-record persistence and list readback including dashboard summaries, decision persistence from sanitized collection-run artifacts, `approved` requiring a ready collection run, release approval bag ingestion, default `cycle_history` bundle-task coverage, default `owner_audit` bundle-task coverage, default `profile_feedback` bundle-task coverage, default `platform_action` bundle-task coverage over delivered Growth event-outbox receipts, default `central_visual` bundle-task coverage over a supplied Home AI visual harness artifact without running visual tooling inside Growth, default audit-only `learner_cycle` bundle-task coverage, explicit non-default `daily_loop_write` bundle-task gating, no Gateway, no direct daily-loop, cycle-history, Owner audit, learner-cycle service, Home AI Action Inbox/Web Push internal access, or visual tooling, no publication, no evaluation, no scheduler execution/tick, no notification delivery, no stage activation, no runtime config flip, and `writefulSchedulingAllowed=false`. |

Automation must not begin until Owner audit is complete enough to explain
previous AI decisions from persisted bounded records.

## Harness Contract

Every implementation slice must update both documentation and harness.

Minimum harness by boundary:

| Boundary | Required evidence |
| --- | --- |
| Model boundary | fake Gateway valid stream, valid JSON, empty output, invalid JSON, timeout, privacy-risk output, repair failure. |
| Service boundary | focused service tests for policy, validation, idempotency, and failure visibility. |
| Route boundary | visible-target allow/deny tests, Owner/workspace role tests, bounded query normalization, no business policy in routes. |
| Repository boundary | transaction rollback, idempotency, schema variants such as publish-attempt column migration, privacy-risk field rejection. |
| Vertical loop | Fanfan science daily path from plan draft to card publish, learner evidence, evaluation, ledger, Profile V2, profile delta, profile-feedback evidence, trajectory recommendation, and the next `growth.learningLoopState.v1` projection returning `ready_to_draft` / `draft_daily_plan` from the completed cycle. The same harness continues the completed cycle into a summary-only automation proposal, Owner acceptance, a read-only scheduler `would_publish` candidate, and a pending digest required action without automatic publish or extra model calls. |
| Audit completeness | required/missing audit evidence, failed/blocked publish visibility, downstream partial failure visibility, privacy projection, and fail-closed behavior when workspace scope or cycle service is missing. |
| Owner audit/correction smoke | `npm run smoke:owner-audit` defaults to read-only cycle audit, audit completeness, evidence audit, profile-delta audit, and correction readback through the normal service graph; correction recording requires explicit `--allow-write`, writes only through `learning-owner-correction-service.recordCorrection`, refreshes the same bounded audit DTOs, rejects privacy-risk input, feeds release evidence through the default `owner_audit` bundle task as `productionOwnerAuditSmokeEvidence`, and has architecture guards against direct repository, Gateway, daily-loop, card-generation, evaluation, scheduler, notification, and stage-activation calls. |
| Owner daily-loop backend facade | context preview, draft delegation, publish delegation, bounded generation projection without authoring draft internals, publish failure visibility, audit/completeness refresh, privacy-risk input rejection, Owner-only routes, visible-target checks, and architecture no-direct-Gateway/SQLite guard. |
| Owner learning-loop state readback | `learning-loop-state-service`, Owner-only `GET /api/v1/growth/learning-loop/state`, `tests/learning-loop-state-service.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js`, the post-cycle state assertion in `tests/learning-card-ai-loop-harness.test.js`, the learner-cycle-full-to-loop-state smoke chain in `tests/growth-learner-cycle-smoke-script.test.js`, `npm run smoke:learning-loop-state`, summary-only `growth.learningLoopState.v1`, nested `growth.learningLoopState.recommendationEvidence.v1`, and architecture guards against Gateway, direct repository, publication, generation, evaluation, scheduler, notification, handoff, stage activation, or learner-state mutation. The recommendation evidence trace must explain the next recommendation from bounded evidence ids, source card/evaluation ids, plan drafts, profile-delta audits, Owner corrections, Profile V2 node summaries, and trajectory lifecycle rows without exposing raw learner/model content. |
| Stage checkpoint controls readback | `learning-stage-checkpoint-controls-service`, Owner-only `GET /api/v1/growth/stage-assessments/controls`, `tests/learning-stage-checkpoint-controls-service.test.js`, `tests/growth-frontend-adapter.test.js`, route tests, layout tests, and architecture guards prove a summary-only `growth.stageCheckpointControls.v1` read model over `learning-stage-assessment-service.stageReadiness()`. It can advertise refresh, Owner activation, and learner challenge route templates; the embedded Owner UI may render the DTO and gate the activation button from `activate_stage_assessment`, but it must not activate a stage assessment, publish plans, generate cards, call Gateway/model vendors, evaluate submissions, schedule work, notify, inspect SQLite tables directly, mutate learner state, or recompute eligibility in the browser. |
| Learning-cycle history readback | `learning-cycle-history-service`, Owner/workspace `GET /api/v1/growth/learning-cycles/history`, `scripts/smoke-growth-cycle-history.js`, `tests/learning-cycle-history-service.test.js`, `tests/growth-cycle-history-smoke-script.test.js`, route visible-target tests, and architecture guards prove selectable summary-only history over public plan/evidence/profile-delta/correction/completeness DTOs without Gateway, direct repository access, writes, publication, generation, evaluation, scheduling, notification, stage activation, or learner-state mutation. |
| Profile feedback evidence | `learning-profile-feedback-evidence-service`, `scripts/smoke-growth-profile-feedback.js`, `tests/learning-profile-feedback-evidence-service.test.js`, `tests/growth-profile-feedback-smoke-script.test.js`, and the post-cycle profile-feedback assertion in `tests/learning-card-ai-loop-harness.test.js` prove summary-only completed-cycle audit/evidence/profile-delta/Profile V2/recommendation/next-state readback. The boundary requires a completed-cycle selector and has architecture coverage for no Gateway, direct repository, publication, generation, evaluation, scheduler, notification, stage activation, or learner-state mutation. |
| Supervised automation proposal | previous-cycle source id required; completeness gate before planner draft; target provisioning before planner draft; summary-only proposal persistence; duplicate/idempotent save; Owner decision status, terminal-decision idempotency, conflicting-decision rejection, accepted-only publish execution, successful execution idempotency, failed/blocked execution visibility, legacy decision/execution-column migration; Owner-only write routes; visible-target read route; `npm run smoke:proposal` read-only list/write-gated operational evidence; completed-cycle integration evidence from `tests/learning-card-ai-loop-harness.test.js`; no direct Gateway, direct-card-generation, direct plan-publisher, stage-assessment activation, or scheduler calls from the CLI. |
| Scheduler dry-run | accepted-proposal listing; skip already-published proposals; recheck audit completeness before provisioning; block unprovisioned targets; return `would_publish` only when safe; Owner-only write-style route authorization; no Gateway, plan publication, card generation, proposal execution writes, notifications, stage-assessment activation, or direct table access. |
| Stage assessment smoke | `npm run smoke:stage-assessment` defaults to read-only `stageReadiness`, gates `eligibility`, `activate`, and `complete` with explicit `--allow-write`, delegates only to `learning-stage-assessment-service`, and has architecture coverage proving no direct repository, Gateway, plan publication, evaluation, automation, or learner-state bypass from the CLI. |
| Stage checkpoint controls smoke | `npm run smoke:stage-checkpoint-controls` is no-write, delegates only to `learning-stage-checkpoint-controls-service`, returns summary-only `growth.stageCheckpointControls.v1`, rejects write flags and privacy-risk input, feeds release evidence as `stageCheckpointControlsEvidence`, and has architecture coverage proving no direct repository, Gateway, stage activation, plan publication, generation, evaluation, automation, or learner-state bypass from the CLI. |
| Automation digest | create/list/review summary-only digest packets from dry-run candidates; preserve non-writeful flags and explicit Owner actions; persist blocked reasons; reject privacy-risk payloads; route Owner/visible-target scope; no Gateway, publication, proposal execution, notification, Action Inbox, stage activation, or direct table access. |
| Automation failure policy | create/list/review summary-only rollback/failure policies; activate draft policies through Owner review; report missing active policy as a fail-closed readiness state; keep `writefulSchedulingAllowed=false`; reject privacy-risk payloads; route Owner/visible-target scope; no Gateway, publication, proposal execution, scheduler/dry-run, notification, Action Inbox, stage activation, or direct table access from the service. |
| Automation action handoff | create/list/deliver summary-only handoff records only from reviewed digests after active failure-policy readiness; map `growth.automation.action_required` event metadata; record delivered or `delivery_failed` states; reject privacy-risk payloads; route Owner/visible-target scope; no Gateway, scheduler/dry-run, publication, proposal execution, card generation, stage activation, or direct table access from the service. |
| Automation scheduler execution | create/list summary-only execution attempts; default-disabled blocked state; delivered-handoff, reviewed-digest, active-policy, matching-dry-run, and accepted-proposal rechecks; accepted-proposal publish delegation only; failed publish visibility; route Owner/visible-target scope; no Gateway, direct plan publication, card generation, notification, Action Inbox, queue/worker, stage activation, or direct table access from the service. |
| Automation scheduler worker target | create/list/review summary-only worker target config; target provisioning required before proposal and before enabling; supported review states are `proposed`, `enabled`, `disabled`, and `archived`; list route is visible-target scoped; create/review routes are Owner-only; service has no Gateway, scheduler run/execution, publication, card generation, notification, stage activation, or learner-state repository calls. |
| Automation scheduler worker lease | default-disabled timer behavior; reviewed enabled target preference before local environment fallback; active/stale lease protection; scheduler-run-service-only delegation; summary-only release state; no direct handoff listing, execution, Gateway, publication, card generation, notification, stage activation, or learner-state writes. |
| Automation release readiness | advisory readiness evaluation, summary-only snapshot persistence, remediation plan fields for missing/blocked/evidence-required checks and next action, external evidence keys, platform action evidence from delivered Growth event-outbox receipts, central visual evidence from a Home AI visual harness artifact, `growth.learningAutomationReleaseEvidenceBundle.v1` bundle builder evidence plus `growth.learningAutomationReleaseEvidenceBundleAudit.v1` self-audit evidence, read-only release approval bag collection, active dependency checks, disabled-config checks, explicit release approval checks, Owner-only snapshot writes, visible-target list/read, privacy-risk rejection, and no Gateway/publication/evaluation/scheduler execution/tick/notification/stage activation/learner-state mutation or Growth-side visual-tool execution from readiness, bundle-builder, or bundle-audit boundaries. |
| Non-sample loop | visible but unprovisioned target blocks before model calls; explicit provision enables; wrong subject blocks; target workspace owns rows. |
| UI boundary | progress state, visible errors, mobile scroll, dark mode contrast, no hidden lower controls, no silent generate action, and stage-checkpoint activation gated by the controls DTO rather than browser-side eligibility logic. |
| Visual release | central Home AI embedded-plugin visual harness for mobile and embedded shell before production UI deploy. |
| Docs locality | `node scripts/check-growth-docs-locality.js` and `node --test tests/growth-docs-locality.test.js`. |

Broad local gate after a completed slice:

```bash
npm run check
npm test
git diff --check
```

For UI release, also run:

```bash
cd /Users/hermes-dev/HermesMobileDev/app
npm run ios:pwa:visual -- \
  --scenario embedded-plugin-shell \
  --plugin-id growth \
  --debug-url http://127.0.0.1:19073/
```

## Current Status

The backend foundation is locally implemented for the main operating-loop
services and focused harnesses, including the Fanfan science vertical, a
non-sample provisioned science vertical, the learning-cycle audit aggregate,
audit-completeness readback, the Owner daily-loop backend facade, the
supervised automation proposal boundary, and the first read-only scheduler
dry-run boundary. The Fanfan science vertical now also proves that a completed
cycle can become a summary-only accepted automation proposal, a read-only
`would_publish` scheduler candidate, and a pending digest required action
without automatic publication or extra authoring/evaluation model calls. The
automation digest backend is also implemented locally:
it creates, lists, and reviews summary-only dry-run digest packets through
`learning-automation-digest-service`, `automation-digests.js`, and
Owner/visible-target scoped `/api/v1/growth/automation/digests` routes without
publishing, notifying, enqueueing, or activating stage assessments.
The automation action handoff backend is implemented locally: it creates,
lists, and delivers summary-only handoff records through
`learning-automation-action-handoff-service`,
`automation-action-handoffs.js`, `learning_growth_automation_action_handoffs`,
and Owner/visible-target scoped `/api/v1/growth/automation/action-handoffs`
routes after reviewed-digest and active-failure-policy gates pass. Delivery
uses the existing `growth-event-service` notification boundary and records
visible `delivery_failed` metadata without publishing or mutating learner
state.
The scheduler execution backend is implemented locally and remains
default-disabled: it can record blocked/failed/published execution attempts and
delegate only to accepted-proposal publish after execution-time gate rechecks,
but it does not add background scheduling.
The proposal service can create an Owner-reviewed dry-run proposal after audit
completeness and target provisioning pass, record Owner decisions, and publish
only accepted proposals through an explicit Owner action that delegates to the
plan publisher and records execution metadata. It still must not start
writeful scheduling. The scheduler dry-run service can inspect accepted
proposals and return `would_publish` / blocked / skipped candidates without
writing or publishing. The daily-loop backend facade can preview context,
draft, publish, and refresh audit/completeness DTOs through Owner-only routes,
but the product is not yet complete because Owner planner/provision UI, audit
UI, production planner readiness smoke, proposal review UI, production proposal
smoke evidence, scheduler/digest UI, platform action UI or Action Inbox/Web
Push evidence, and a production Home AI central visual harness artifact still
need to be completed and ingested before production rollout.

The next product-visible improvement should be the Owner-supervised daily
planning UI. The audit UI should consume the learning-cycle aggregate for
cycle-level drilldown, and the completeness route for closure/readiness
badges, instead of stitching plan, evidence, profile-delta, and correction
routes in browser code.
