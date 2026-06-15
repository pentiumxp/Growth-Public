# Growth AI Learning Operating Loop Execution Blueprint

Last updated: 2026-06-15.

## Purpose

This document turns the Growth AI learning-loop direction into an
implementation-ready blueprint. It is intentionally more operational than
`docs/GROWTH_LEARNING_OPERATING_LOOP.md`.

For the durable system scheme, use
`docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`. For the closed-loop product
contract, use `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`. For delivery
order, stage gates, and current-to-next capability planning, use
`docs/GROWTH_AI_LEARNING_ROADMAP.md`. For the immediate next-stage choice and
release-readiness semantics, use
`docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`. For implementation packages and
package-level definition of done, use
`docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`. For scheduling-adjacent work,
read
`docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` before implementing
digest, notification, Action Inbox, rollback, or writeful scheduler behavior,
and read `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` before
changing Owner-explicit scheduler execution.
Read `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` before
changing supervised scheduler run/tick behavior or any future background
worker.
This blueprint remains the service, state, and harness implementation
contract.

The target is a supervised, AI-driven, low-pressure, auditable learning loop:

1. Growth observes summary-only learning evidence.
2. Growth projects the learner profile from that evidence.
3. Gateway drafts the next plan.
4. Growth validates and stores the plan as a draft.
5. Owner explicitly publishes one selected item.
6. Gateway authors the card.
7. The learner completes one daily flow or one formal assessment flow.
8. Gateway evaluates current evidence once.
9. Growth updates evidence, profile, reward, trajectory, and audit records.
10. The next planner run uses the updated state.
11. Later automation begins as an Owner-reviewed proposal linked to the
    previous auditable cycle, not as a scheduler or automatic publish path.

Fanfan is the first sample learner. The same design must later support any
authorized learner workspace, domain pack, subject, and knowledge graph.

## Authority And Boundaries

Growth owns the learning loop inside the plugin boundary. Home AI owns
embedding, same-origin proxying, platform workspace grants, shared Gateway
access/config, and central visual/deployment tooling.

Growth must not:

- import Home AI old Growth route/server internals;
- call OpenAI, Claude, DeepSeek, or any model vendor directly;
- store raw learner answers, transcripts, raw prompts, raw model output,
  hidden answer keys, source-document bodies, private file paths, secrets,
  cookies, tokens, or provider configuration in loop records or public DTOs.

Gateway is the only model boundary. Routes remain HTTP glue. Business policy,
state transitions, validation, and persistence must live in Growth services
and repositories.

## Current Baseline

Implemented backend foundation:

- native knowledge-graph import, graph plans, graph bindings, and graph option
  projection;
- Gateway-backed card authoring through the Growth authoring client;
- Gateway-backed evaluation when evaluation Gateway config is present, with a
  deterministic local fallback for harness/local isolation;
- `daily_score_once` daily-card flow: one submission, one evaluation, one
  optional reflection, completion after the first evaluation, and
  score-proportional reward;
- formal stage-assessment activation, generated formal cards, high-weight
  evidence, completion, and cooldown;
- summary-only evidence ledger and Profile V2 projection, including
  source-specific stale-evidence freshness for daily evidence versus formal
  stage-assessment evidence;
- evidence audit readback through `learning-evidence-audit-service` and
  visible-target scoped `GET /api/v1/growth/evidence/audit`;
- planner context, planner Gateway client, plan validation, plan draft
  persistence, and selected-item publish through card generation;
- plan audit readback through `learning-plan-audit-service` and Owner context
  projection of recent drafts, selected published items, generated card ids,
  generated graph plan ids, basis evidence ids, and latest bounded publish
  attempt status/error/stage, plus
  `GET /api/v1/growth/learning-plans/audit` for visible-target scoped readback;
- learning-cycle audit aggregation through `learning-cycle-audit-service` and
  `GET /api/v1/growth/learning-cycles/audit`, composing bounded plan,
  evidence, profile-delta, correction, and plan publish-attempt readbacks into
  one timeline DTO for a card, evaluation, or plan draft;
- selectable learning-cycle history through `learning-cycle-history-service`,
  `GET /api/v1/growth/learning-cycles/history`, and
  `npm run smoke:cycle-history`, composing public plan-audit, evidence-audit,
  profile-delta-audit, correction, and optional completeness DTOs into
  bounded summary-only rows for Owner history selection;
- audit-completeness evaluation through `learning-audit-completeness-service`
  and `GET /api/v1/growth/learning-cycles/completeness`, which reads only the
  public cycle-audit DTO and reports whether required audit evidence is present
  before a cycle can be trusted for UI closure or future automation;
- supervised automation proposal dry-run through
  `learning-automation-proposal-service`,
  `learning_growth_automation_proposals`, and
  `GET`/`POST /api/v1/growth/automation/proposals` plus
  `POST /api/v1/growth/automation/proposals/:proposalId/decision` and
  `POST /api/v1/growth/automation/proposals/:proposalId/publish`, composing
  audit completeness, target provisioning, draft planning, bounded Owner
  decision persistence, and explicit accepted-proposal publish execution
  without scheduling;
- read-only supervised scheduler dry-run through
  `learning-automation-scheduler-service` and
  `POST /api/v1/growth/automation/scheduler/dry-run`, which lists accepted
  proposals, rechecks audit completeness and target provisioning, and returns
  bounded `would_publish`, blocked, or skipped candidates without Gateway
  calls, publication, proposal execution writes, notifications, or stage
  activation;
- supervised automation digest through
  `learning-automation-digest-service`,
  `learning_growth_automation_digests`, and
  `GET`/`POST /api/v1/growth/automation/digests` plus
  `POST /api/v1/growth/automation/digests/:digestId/review`, which persists
  summary-only scheduler dry-run packets and Owner review metadata without
  publication, proposal execution writes, notifications, queues, Gateway
  calls, or stage activation;
- automation failure policy through
  `learning-automation-failure-policy-service`,
  `learning_growth_automation_failure_policies`, and
  `GET`/`POST /api/v1/growth/automation/failure-policies` plus
  `GET /api/v1/growth/automation/failure-policies/readiness` and
  `POST /api/v1/growth/automation/failure-policies/:policyId/review`, which
  stores summary-only rollback/failure policy, activates draft policies
  through Owner review, and reports active policy readiness as a prerequisite
  only while keeping `writefulSchedulingAllowed=false`;
- automation action handoff through
  `learning-automation-action-handoff-service`,
  `learning_growth_automation_action_handoffs`, and
  `GET`/`POST /api/v1/growth/automation/action-handoffs` plus
  `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`, which
  stores summary-only handoff records only after reviewed-digest and active
  failure-policy gates, emits bounded `growth.automation.action_required`
  metadata through `growth-event-service`, and records delivery success or
  visible failure without publishing or mutating learner state;
- default-disabled Owner-explicit scheduler execution through
  `learning-automation-scheduler-execution-service`,
  `learning_growth_automation_scheduler_executions`,
  `GET /api/v1/growth/automation/scheduler/executions`, and
  `POST /api/v1/growth/automation/scheduler/execute-once`, which rechecks
  delivered handoff, reviewed digest, active failure policy, and read-only
  scheduler dry-run before delegating only to accepted-proposal publication;
- default-disabled supervised scheduler run/tick contract through
  `learning-automation-scheduler-run-service`,
  `learning_growth_automation_scheduler_runs`,
  `GET /api/v1/growth/automation/scheduler/runs`, and
  `POST /api/v1/growth/automation/scheduler/run-once`, which may inspect
  delivered handoffs only when `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`
  is true and delegates individual actions only to the execution service;
- Owner-reviewed scheduler worker target configuration through
  `learning-automation-scheduler-worker-target-service`,
  `learning_growth_automation_scheduler_worker_targets`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/worker-targets`, and Owner-only
  create/review routes. Target creation checks learning-target provisioning,
  review can move targets to `enabled`, `disabled`, or `archived`, and
  enabled targets are the only production-runnable worker targets;
- default-disabled scheduler worker/lease mechanics through
  `learning-automation-scheduler-worker-service`,
  `learning_growth_automation_scheduler_worker_leases`, and optional HTTP
  timer glue. The worker prefers reviewed enabled targets before local
  environment fallback and delegates only to the scheduler run service;
- completed-cycle profile-feedback evidence through
  `learning-profile-feedback-evidence-service` and
  `npm run smoke:profile-feedback`, which verifies audit completeness,
  persisted evidence, persisted profile delta, Profile V2 projection, next-card
  recommendation, and next learning-loop state from a bounded completed-cycle
  selector without writing or calling Gateway;
- target/domain-pack provisioning service and repository;
- service-level Fanfan science vertical harness from planner draft through
  card publish, learner evidence, evaluation, evidence ledger, Profile V2, and
  profile delta, then through no-write profile-feedback evidence and next
  learning-loop state readback;
- service-level non-sample science vertical harness proving explicit
  domain-pack/subject provisioning before planner/authoring Gateway calls and
  target-workspace scoped plan, card, ledger, Profile V2, and profile-delta
  rows;
- post-evaluation `profile_delta` DTO returned by evaluation processing and
  persisted in `learning_growth_profile_delta_audits`.

Important gaps:

- embedded Owner UI now exposes planner draft preview, explicit plan publish,
  `growth.learningLoopState.v1`, context-level `ownerAudit`, Owner correction
  writes, and current-card cycle audit/completeness drilldown. Backend
  selectable cycle history is available, but it still lacks product-grade
  browser history selection controls and central production visual release
  evidence;
- production planner readiness smoke has not yet been run against real
  Gateway config for this planner UI rollout;
- embedded weekly and stage-checkpoint UI remains future work, but the backend
  horizon policy already validates `weekly_plan`, `repair_plan`, and
  `stage_checkpoint_plan`, and direct formal publication remains blocked by
  `learning-plan-publisher-service`;
- broad multi-workspace/domain-pack rollout still needs embedded target switch
  and provision UI, but the backend non-sample provisioned vertical is now
  covered by the service harness.

## Capability Milestones

The operating loop should be delivered as staged capabilities, not as one large
opaque automation switch.

| Milestone | Capability | Completion rule |
| --- | --- | --- |
| Backend evidence loop | Growth can persist summary-only evidence, project Profile V2, draft a Gateway plan, publish one selected item, evaluate once, persist profile delta, expose bounded audit readback, project the completed cycle into no-write profile-feedback evidence and the next `ready_to_draft` learning-loop state, and prepare an Owner-reviewed automation packet without publishing automatically. | Service, repository, route, and AI-loop harness pass locally, including post-cycle profile-feedback/state readback plus completed-cycle proposal, scheduler dry-run, and digest evidence. |
| Owner supervised daily loop | Owner can select learner/domain/subject, inspect compact loop status from `growth.learningLoopState.v1`, publish one validated daily card, and inspect completion audit from the Growth UI. | Learning-loop state smoke, daily-loop smoke, embedded UI, mobile/dark-mode visual harness, and production readiness smoke pass. |
| Stage checkpoint loop | Growth can recommend formal checkpoints from Profile V2 and evidence freshness while activation/cooldown remains owned by `learning-stage-assessment-service`. | Stage planning harness proves no daily backlog debt and no silent formal card publication. |
| Multi-workspace/domain-pack loop | Any visible and provisioned learner/domain pack can use the same planner/author/evaluate/audit pipeline. | Cross-workspace allow/deny route and UI harnesses prove actor workspace and learner workspace never mix. |
| Supervised automation proposal | Owner can review a proposed next learning action linked to a previous completed cycle without automatic publication. | Proposal service/repository/route harnesses plus the Fanfan science completed-cycle harness prove completeness gating, target provisioning, privacy rejection, Owner-only writes, and no direct Gateway/card-generation/scheduler calls. |
| Supervised digest and scheduling readiness | Owner can review persisted dry-run packets and action handoff state before controlled scheduling is allowed. | Scheduler dry-runs remain read-only; digest persistence/review, rollback/failure, Growth action handoff, platform notification/action evidence, and visual evidence are proven before any writeful worker. |
| Owner-explicit scheduler execution | Owner can execute one delivered, reviewed, accepted proposal while writeful execution remains default-disabled. | Execution service/repository/route harnesses prove disabled-config blocking, execution-time gate rechecks, accepted-proposal publish delegation, bounded execution state, and no direct Gateway/card-generation/direct-plan-publish/stage-activation/table access. |
| Background scheduler contract | Growth can record a supervised scheduler tick, review persistent worker targets, and protect a default-disabled worker lease path without enabling unattended production automation. | Scheduler run service/repository/route harnesses prove disabled-config blocking, delivered-handoff candidate handling, delegation only to execution, bounded run state, and no direct Gateway/card-generation/direct-plan-publish/stage-activation/table access. Worker target repository/service/route harnesses prove provisioning checks, proposed/enabled/disabled/archived states, summary-only persistence, and no scheduler/model/publication calls. Worker lease repository/service/HTTP-glue harnesses prove disabled timer behavior, reviewed-target preference before local env fallback, active lease protection, stale lease reclaim, and scheduler-run-service-only delegation. |

The current local backend is in the first milestone. Product completeness for
Owner use requires the second milestone.

## Execution Roadmap From Current State

The next work should optimize for a closed, observable loop before adding
larger automation. The sequence below is the implementation contract for the
next stages.

| Stage | Goal | Owner-visible capability | Backend capability | Required evidence |
| --- | --- | --- | --- | --- |
| 1. Supervised daily planning UI | Make one Fanfan science or English daily card publishable without Codex. | Owner selects Fanfan, domain pack, subject, horizon, and time budget; sees readiness; drafts; reviews; publishes one card. | Existing planner, validation, draft persistence, publish bridge, authoring, and evaluation services are used without new model boundaries. | UI route tests, frontend adapter/layout tests, planner context tests, central embedded visual harness. |
| 2. Audit and correction UI | Make the loop explain itself after completion. | Owner sees plan reason, evidence basis, published plan link, Profile V2 changes, persisted profile delta, Owner corrections, and next recommendation. | Existing `ownerAudit`, plan-audit readback, profile-delta audit read, correction read/write, and Profile V2 absorption are rendered through bounded DTOs. | Context service tests, plan-audit tests, correction service tests, profile-delta read tests, UI privacy tests, architecture guard. |
| 3. Stage checkpoint UI | Separate routine practice from formal profile updates. | Owner sees readiness/cooldown and can activate a formal checkpoint only through the assessment controls. | Planner can suggest stage checkpoints, but direct formal publish remains blocked; `learning-stage-assessment-service` owns activation. | Stage-readiness tests, publisher blocking tests, route tests, visual tests. |
| 4. Multi-workspace/domain-pack rollout | Generalize from Fanfan to any authorized learner and domain pack. | Owner can provision a visible learner/domain pack, then run the same daily loop. | Target provisioning, graph-node validation, and route visibility keep actor and learner workspaces separate. | Cross-workspace allow/deny route tests, UI target-switch tests, no-data-mixing architecture guard. |
| 5. Supervised automation proposal | Reduce manual repetition without hiding decisions. | Owner reviews a next-learning proposal linked to the previous completed cycle, records a decision, then explicitly publishes one accepted daily item. | Proposal creation checks audit completeness, checks target provisioning, creates a validated plan draft, stores summary-only proposal metadata, records Owner decision, and publishes accepted proposals only through the plan publisher while recording bounded execution metadata. | Proposal service/repository/route tests, audit-completeness tests, completed-cycle-to-proposal evidence in `tests/learning-card-ai-loop-harness.test.js`, execution metadata tests, privacy tests, architecture no-direct-Gateway/direct-card-generation/scheduler guard. |
| 6. Supervised digest and scheduling readiness | Prove scheduling candidates before they can write. | Owner reviews a persisted digest of dry-run candidates, blocked reasons, skipped candidates, explicit Owner actions, and delivery handoff state. | Digest service stores summary-only review packets from read-only scheduler dry-runs; action handoff service stores reviewed digest actions after active failure-policy readiness and emits bounded platform metadata. Future scheduler remains blocked until UI, platform, and visual evidence are proven. | Scheduler dry-run tests, digest repository/service/route tests, completed-cycle-to-digest evidence in `tests/learning-card-ai-loop-harness.test.js`, rollback/failure tests, action handoff repository/service/event/route tests, platform notification/action evidence. |
| 7. Owner-explicit scheduler execution | Prove the final write path without adding a background worker. | Owner can call one `execute-once` action only after handoff delivery, digest review, active policy, accepted proposal, and dry-run match are rechecked. | Execution service remains default-disabled, records blocked/failed/published state, and delegates only to accepted-proposal publish. Background scheduling remains a separate future contract. | Scheduler execution repository/service/route tests, disabled-config tests, failed-publish tests, idempotency tests, architecture guard, production dry-run evidence before enabling. |
| 8. Background scheduler contract | Prove the supervised tick path, reviewed worker target path, and default-disabled worker lease path without enabling unattended production automation. | Owner can inspect run history and blocked/skipped/partial run state; Owner can propose/review worker targets; local worker leases can prove no-overlap mechanics before production release. | Scheduler run service remains default-disabled, records blocked/skipped/completed/partial/failed state, lists delivered handoffs only when enabled, and delegates only to execution. Worker target service stores only Owner-reviewed summary-only target config after provisioning passes. Worker service remains separately disabled by default, prefers enabled reviewed targets before local env fallback, claims summary-only target leases, and calls only scheduler-run service. | Scheduler run repository/service/route tests, worker target repository/service/route tests, worker lease repository/service tests, disabled-config tests, target review/list tests, active/stale lease tests, no-delivered-action tests, partial execution tests, HTTP timer test, architecture guard, production dry-run and central visual evidence before enabling. |

Do not skip Stage 1 and Stage 2. A fully AI-driven learning loop is only safe
when Owner can inspect the reasoning and the profile effect of the previous
cycle before trusting broader automation.

## Implementation Package Contract

Each delivery slice should be treated as a package with five required parts:

1. Service boundary: the business decision or state transition lives in a
   Growth service with explicit dependencies. Routes remain request/auth/target
   glue, and browser code remains UI state plus API calls.
2. Persistence or DTO boundary: durable records and public DTOs are owned by a
   repository or read service. The public shape is summary-only and stable
   enough for Owner UI and later audit.
3. Harness boundary: the smallest focused service, route, repository,
   architecture, privacy, UI, or visual harness is added or updated before the
   slice is considered closed.
4. Documentation boundary: the relevant Growth-local document is updated in
   the same change. Product rules belong in
   `docs/GROWTH_AI_LEARNING_ROADMAP.md` or
   `docs/GROWTH_CARD_GENERATION_RULES.md`; service and state rules belong in
   this blueprint and `docs/GROWTH_PLUGIN_ARCHITECTURE.md`; UI rules belong in
   `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` or
   `docs/GROWTH_CARD_INTERACTION_FLOW.md`.
5. Release evidence boundary: UI work requires frontend/layout tests and the
   central Home AI embedded-plugin visual harness before production release.
   Backend-only work requires focused tests plus the broad local gate.

No slice is complete if it adds behavior without the matching document and
harness. A route that implements policy directly, a UI that computes profile
state from raw payloads, or a model call without a validated draft boundary is
outside this blueprint.

The current next-stage selector is
`docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`. It defines the preferred
product-visible path, the backend-only release-readiness path, and the rule
that readiness evidence must not become execution permission.

### Current Package: Owner-Supervised Daily Loop

The first browser operation path is now minimally closed for a Fanfan daily
card. The Owner `生成` tab can load context, show the compact
`growth.learningLoopState.v1` state, draft a daily-loop plan, preview the
selected item, explicitly publish one item, and refresh the board and loop
state. It can also inspect the current generated/completed card through
summary-only cycle audit/completeness drilldown. The backend selectable
cycle-history DTO is implemented. The remaining product-visible work for this
package is to make browser older-cycle selection controls complete and to
produce central visual release evidence.

Required shape:

- render target/domain-pack/subject scope, `targetProvisioning`,
  `graphOptions`, Profile V2, evidence audit, planner/authoring/evaluation
  readiness, and recent Owner audit summaries in the `生成` tab. The current
  UI now includes the domain-pack/subject selector and explicit Owner
  provision action over `POST /api/v1/growth/domain-pack-provisions`;
- create a planner draft through `POST /api/v1/growth/daily-loop/draft`,
  which delegates to `learning-plan-publisher-service.draftPlan`;
- show a bounded plan preview with target nodes, role, difficulty, support
  level, evidence requirements, estimated minutes, and rationale;
- publish one selected daily item through
  `POST /api/v1/growth/daily-loop/publish`, which delegates to
  `learning-plan-publisher-service.publishPlanItem`;
- preserve the generated card preview and render failed/blocked
  `publishAttempt` metadata when publication does not create a card;
- after learner completion, refresh Owner audit and current-cycle
  completeness from service DTOs rather than recomputing profile changes or
  audit state in browser code.

Backend facade status:

- `learning-daily-loop-service` and Owner-only daily-loop routes are
  implemented for preview, draft, and publish.
- The service composes existing context, plan-publisher, cycle-audit, and
  audit-completeness services. It is not a new model boundary and not a
  scheduler.
- UI work should consume this facade first, then use lower-level audit routes
  only for explicit single-card drilldown.

Minimum package harness:

- context, target-provisioning, plan-publisher, route, frontend adapter, and
  embedded layout tests;
- docs-locality checks;
- central visual harness for mobile scroll, dark-mode contrast, visible
  progress, and no hidden lower controls.

Package closure checklist:

| Area | Required closure |
| --- | --- |
| Service ownership | New business rules, readiness mapping, publish-attempt interpretation, or audit composition live in services. Browser code can select, call, and render DTOs, but it must not compute learner mastery or bypass service policy. |
| Route boundary | Routes keep authorization, visible-target checks, request normalization, service delegation, and bounded response formatting only. |
| UI behavior | Every async action has a pending state, success state, and bounded error state. Mobile content must scroll to the final action controls, and dark mode must preserve readable contrast. |
| Daily-card policy | Published daily cards keep `daily_score_once`: one submission, one evaluation, one optional reflection, completion after first evaluation, and no pass-line retry gate. |
| Audit closure | The UI links the published card back to plan audit, evidence audit, profile-delta audit, correction history, cycle audit, and completeness status through existing read DTOs. |
| Privacy closure | UI DTOs, tests, logs, screenshots, and docs exclude raw learner answers, transcripts, prompts, raw model output, answer keys, source-document bodies, private paths, credentials, and provider configuration. |
| Visual release | Production UI release waits for the central Home AI embedded-plugin visual harness evidence, not only local unit tests. |

### Following Package: Owner Audit And Correction UI

After the daily browser loop can publish a card, the next package should make
the result explainable. Current status: the Owner `生成` tab already renders
the context-level `ownerAudit` panel, can write bounded Owner correction
evidence through the profile-correction route, and can read current-card
single-cycle drilldown and completeness readback:

- render cycle audit, evidence audit, persisted profile-delta audit,
  correction history, and recommendation lifecycle from bounded service DTOs;
- let Owner add bounded correction or confirmation evidence through
  `learning-owner-correction-service`;
- show whether `learning-audit-completeness-service` considers the source
  cycle ready for trusted follow-up;
- keep `readyForAutomation` as audit evidence only; it is not browser
  permission to schedule, publish, notify, or run workers;
- keep raw learner answers, transcripts, prompts, raw model output, hidden
  answer keys, source-document bodies, private paths, credentials, and provider
  configuration out of UI DTOs and screenshots.

This package should complete before supervised proposal review becomes a
primary Owner workflow.

### Later Package: Automation Digest Gate

The scheduling-adjacent backend package now persists dry-run review packets
before any writeful worker is designed.

The owning plan is
`docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`.

Implemented backend shape:

- `learning-automation-digest-service` sits over the existing scheduler dry-run
  service and proposal/audit/provision read services;
- `automation-digests.js` and
  `learning_growth_automation_digests` for summary-only digest persistence;
- Owner/visible-target scoped digest list, create, and review routes are
  implemented;
- keep digest creation and review non-writeful with respect to learning
  actions: no publish, no proposal execution write, no notification, no
  queue, no stage activation;
- use the digest UI as the first Owner review surface for would-publish,
  blocked, skipped, and already-published dry-run candidates.

Minimum package harness:

- repository tests for idempotency, summary-only privacy class, privacy-key
  rejection, migration, and rollback;
- service tests for valid dry-run digest creation, blocked candidates,
  non-writeful flag preservation, privacy rejection, and forbidden dependency
  calls;
- route tests for Owner-only writes, workspace bearer, visible-target scope,
  bounded filters, and visible failures;
- architecture guard for no Gateway, plan publication, card generation,
  proposal publish, notification, Action Inbox, stage activation, or direct
  table access.

This package is not required for the first Fanfan daily-card browser loop, but
it is required before writeful scheduling, notification handoff, or automatic
publication.

### Later Package: Release-Readiness Evidence

The release-readiness package is a bounded evidence aggregate. It exists to
make missing prerequisites visible before any production execution or
background scheduling decision.

The owning plan is
`docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`.

Backend shape:

- `learning-automation-release-readiness-service`;
- `learning-automation-release-evidence-bundle-service`;
- `automation-release-readiness.js`;
- `learning_growth_automation_release_readiness`;
- visible-target scoped
  `GET /api/v1/growth/automation/release-readiness`;
- visible-target scoped snapshot list and Owner-only snapshot create routes
  under `/api/v1/growth/automation/release-readiness/snapshots`.
- `npm run smoke:release-evidence-bundle` for summary-only evidence bundle
  assembly from selected no-write/default-disabled smoke CLIs, including
  learner-cycle audit, read-only stage-assessment readiness, proposal smoke,
  and release-approval bag projection by default. The learner-cycle bundle
  path is audit-only and maps to `productionLearnerCycleSmokeEvidence`; write
  operations must use direct `npm run smoke:learner-cycle` with explicit
  Owner-requested evidence. The controlled daily-loop draft/publish evidence
  path is the explicit non-default `daily_loop_write` task, gated by
  `--allow-write-evidence` and delegated to `scripts/smoke-growth-daily-loop.js`.

Required behavior:

- aggregate product UI, audit UI, stage-checkpoint evidence from
  `npm run smoke:stage-assessment`, proposal review, production proposal smoke,
  digest, active failure-policy, delivered handoff, execution gate, scheduler
  run, reviewed worker target, worker lease, planner smoke, controlled
  daily-loop write smoke, learner-cycle audit smoke, production dry-run,
  platform Action Inbox/Web Push, visual, and release approval evidence;
- return bounded `pass`, `missing`, `blocked`, or `not_applicable` check
  states;
- persist optional summary-only readiness snapshots for Owner/release review;
- accept summary-only `growth.learningAutomationReleaseEvidenceBundle.v1`
  artifacts produced by the bundle builder without trusting raw smoke output,
  including bounded `releaseApproval` fields collected from
  `npm run smoke:release-approval -- --operation bag` and bounded
  `productionLearnerCycleSmokeEvidence` collected only from no-write audit,
  plus bounded
  `productionDailyLoopWriteSmokeEvidence` only when the explicit
  `daily_loop_write` task passes;
- keep `writefulSchedulingAllowed=false`;
- never call Gateway, plan publication, card generation, evaluation,
  learner-cycle services, proposal execution, scheduler execution, scheduler
  run, Action Inbox/Web Push delivery, stage-assessment activation, or
  learner-state writes.

Minimum package harness:

- repository tests for migration, idempotent snapshot writes, summary-only
  privacy class, and privacy-key rejection;
- service tests for missing evidence, dependency failure, disabled config,
  all-pass release review state, and no forbidden dependency calls;
- route tests for visible-target scope, Owner-only snapshot writes, bounded
  filters, and visible failure states;
- architecture guard for no direct Gateway/publication/card generation/
  evaluation/scheduler/stage-assessment/learner-state access.

### Later Package: Owner-Explicit Scheduler Execution

The first writeful execution package is intentionally narrower than a
scheduler. It proves the final service boundary for one Owner action and keeps
background automation out of scope.

The owning plan is
`docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md`.

Implemented backend shape:

- `learning-automation-scheduler-execution-service`;
- `automation-scheduler-executions.js`;
- `learning_growth_automation_scheduler_executions`;
- visible-target scoped
  `GET /api/v1/growth/automation/scheduler/executions`;
- Owner-only
  `POST /api/v1/growth/automation/scheduler/execute-once`;
- default-disabled config gate
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED`.

Required behavior:

- support only `owner_explicit_once`;
- record a bounded blocked execution while disabled;
- recheck delivered handoff, reviewed digest, active failure-policy readiness,
  and scheduler dry-run at execution time;
- publish only by delegating to
  `learning-automation-proposal-service.publishAcceptedProposal`;
- record bounded `started`, `published`, `failed`, `blocked`, or `skipped`
  metadata;
- never call Gateway, card generation, direct plan publish, notification,
  Action Inbox, queues/workers, stage-assessment activation, or SQLite tables
  directly.

This package is not background scheduling. Background scheduling still requires
Owner UI, platform action evidence, visual evidence, production dry-run
evidence, and an explicit release decision.

## Loop State Machine

The daily loop should be auditable as this state chain:

| State | Owner | Durable state | Model boundary |
| --- | --- | --- | --- |
| `target_selected` | Owner selects learner, domain pack, subject, horizon, and time budget. | Target visibility and provision read. | None. |
| `context_projected` | Owner sees Profile V2, evidence audit, graph options, and readiness. | Read-only context DTO. | None. |
| `plan_drafted` | Owner sees validated draft reason and selected targets. | `learning_growth_plan_drafts`. | Planner Gateway. |
| `plan_publish_attempted` | Owner explicitly tries to publish one selected item. | `learning_growth_plan_drafts` latest publish-attempt metadata records `published`, `failed`, or `blocked` with bounded error/stage and no raw payload. | None. |
| `plan_published` | Owner explicitly publishes one selected item. | Plan draft marked published only after card publish succeeds. Failed or blocked attempts leave the plan in draft state. | None. |
| `card_authored` | Owner sees generated card preview. | `learning_task_cards`, graph binding, publish audit. | Authoring Gateway. |
| `learner_submitted` | Learner submits one answer payload. | Submission/audio/session rows and evaluation job. | None. |
| `evaluated` | Learner sees one score and feedback. | Evaluation row, reward settlement, job completion. | Evaluation Gateway or fallback. |
| `evidence_projected` | Owner can inspect evidence ids and summaries. | `learning_growth_evidence_ledger`. | None. |
| `profile_updated` | Owner can inspect Profile V2 state. | Profile projections and mastery/trajectory rows. | None. |
| `delta_audited` | Owner can inspect what changed and why. | `learning_growth_profile_delta_audits` plus the profile-delta audit read surface. | None. |
| `profile_corrected` | Owner can add a bounded correction or confirmation after audit. | `owner_reviewed_correction` rows in `learning_growth_evidence_ledger` through `learning-owner-correction-service`. | No raw learner payloads or model output; target must be visible and provisioned. |
| `audit_completeness_checked` | Owner or a future scheduler can verify whether required audit evidence exists. | `learning-audit-completeness-service` computes a read-only DTO from `learning-cycle-audit-service`; no new durable row is written. | None. |
| `automation_proposed` | Owner can review a proposed next action and decide whether to publish it. | `learning_growth_automation_proposals` links the previous cycle, new plan draft, selected item, target nodes, bounded rationale, and Owner policy. | Planner Gateway only through the existing plan draft boundary. |
| `automation_digest_created` | Owner can review a persisted dry-run packet before any future scheduling write. | `learning_growth_automation_digests` stores summary-only candidates, blocked reasons, required actions, and optional review metadata. | None. |
| `automation_failure_policy_active` | Owner can see that scoped rollback/failure policy exists before future scheduling design proceeds. | `learning_growth_automation_failure_policies` stores summary-only policy, rollback, failure, and Owner review metadata. | None. |
| `automation_action_handoff_delivered` | Owner action metadata has been delivered through the Growth event boundary. | `learning_growth_automation_action_handoffs` stores delivered or `delivery_failed` status. | None. |
| `automation_owner_explicit_executed` | Owner explicitly executes one delivered, reviewed, accepted proposal. | `learning_growth_automation_scheduler_executions` stores blocked, failed, skipped, or published execution metadata. | None. |
| `next_recommended` | Owner sees next recommended target or repair. | Trajectory recommendation lifecycle. | None. |

Failure policy:

- invalid model output stops at a visible draft/job/failure state;
- validation failure must not publish partial plans, cards, or evaluations;
- failed or policy-blocked plan publication writes bounded latest
  publish-attempt metadata while preserving the draft/unpublished state;
- proposal creation failure must not publish cards, activate assessments, call
  authoring/evaluation, or enqueue scheduling work;
- DB transaction failure must roll back the affected write;
- profile, trajectory, and profile-delta failures must be visible but must not
  duplicate already-persisted evaluation, reward, ledger, or stage-cycle state.

## Durable Records And Ownership

| Record | Owning module | Purpose | Current state |
| --- | --- | --- | --- |
| Target provision | `learning-target-provisioning-service`, `domain-pack-provisions.js` | Authorizes learner/domain-pack/subject generation after view-target visibility passes. | Implemented. |
| Knowledge graph | `learning-graph-import-service`, `graph-repository.js` | Capability nodes, prerequisites, domain packs, subject options, and graph summaries. | Implemented. |
| Plan draft | `learning-plan-publisher-service`, `learning-plan-drafts.js` | Stores validated planner output before publication plus bounded latest publish-attempt metadata. | Implemented. |
| Plan audit readback | `learning-plan-audit-service`, `learning-plan-drafts.js` | Projects recent validated drafts, publication links, and latest publish-attempt status/error/stage into Owner-safe audit DTOs for context and the plan-audit read route. | Implemented. |
| Automation proposal | `learning-automation-proposal-service`, `automation-proposals.js` | Stores Owner-reviewed proposal metadata that links a complete source cycle to a new validated plan draft and selected item, records bounded Owner terminal decisions, and records bounded execution metadata when an accepted proposal is explicitly published through the plan publisher. It must not start scheduling. | Implemented locally with focused service/route/architecture harness; proposal review UI remains future. |
| Scheduler dry-run | `learning-automation-scheduler-service` | Reads accepted proposals through the proposal service, rechecks source-cycle audit completeness and target provisioning, and returns bounded candidate actions. It must not write durable state, call Gateway, publish plans, generate cards, record proposal execution, send notifications, or activate stage assessments. | Implemented locally with service/route/architecture harness; writeful scheduling remains future. |
| Automation digest | `learning-automation-digest-service`, `automation-digests.js` | Persists summary-only dry-run review packets with would-publish, blocked, skipped, already-published candidates, explicit Owner actions, and optional Owner review metadata. It must not publish, record proposal execution, notify, enqueue, or activate stage assessments. | Implemented locally with focused repository/service/route/architecture harness; digest UI remains future. |
| Automation failure policy | `learning-automation-failure-policy-service`, `automation-failure-policies.js` | Persists summary-only rollback/failure policy, activates draft policies through bounded Owner review, and reports active policy readiness as one future scheduling prerequisite. It must not publish, record proposal execution, notify, call scheduler/dry-run, or activate stage assessments. | Implemented locally with focused repository/service/route/architecture harness; writeful scheduling remains future. |
| Automation action handoff | `learning-automation-action-handoff-service`, `automation-action-handoffs.js` | Persists summary-only handoff records from reviewed digests after active failure-policy readiness, emits `growth.automation.action_required` through the Growth event boundary, and records delivered or `delivery_failed` states. It must not schedule, publish, record proposal execution, call Gateway, generate cards, or activate stage assessments. | Implemented locally with focused repository/service/event/route/architecture harness; platform UI/evidence remains future. |
| Automation scheduler execution | `learning-automation-scheduler-execution-service`, `automation-scheduler-executions.js` | Persists summary-only Owner-explicit execution attempts after delivered handoff, reviewed digest, active failure policy, and matching dry-run candidate are rechecked. It is default-disabled, delegates only to accepted-proposal publish when enabled, and records blocked/failed/published outcomes. | Implemented locally with focused repository/service/route/architecture harness; production enablement and background scheduling remain future. |
| Automation scheduler run | `learning-automation-scheduler-run-service`, `automation-scheduler-runs.js` | Persists summary-only supervised scheduler tick attempts. It is default-disabled, records blocked state when disabled, lists delivered handoffs only when enabled, delegates candidates only to scheduler execution, and records skipped/completed/partial/failed outcomes with stable run ids. | Implemented locally with focused repository/service/route/architecture harness; production background scheduling remains disabled. |
| Task card and graph binding | `learning-card-generation-service`, `card-authoring-publisher.js` | Publishes validated card drafts and graph binding transactionally. | Implemented. |
| Submission/reflection/audio | `evidence-writes.js`, audio repositories, card interaction services | Records learner evidence and optional audio through plugin routes. | Implemented. |
| Evaluation job and evaluation | `evaluation-jobs.js`, `growth-evaluation-service` | Durable one-shot evaluation queue and result write. | Implemented. |
| Evidence ledger | `learning-evidence-ledger-service`, `evidence-ledger.js` | Summary-only unified learning evidence over source rows. | Implemented. |
| Evidence audit readback | `learning-evidence-audit-service`, `evidence-ledger.js` | Projects persisted evidence-ledger rows into Owner-safe audit DTOs for context and the evidence-audit read route. | Implemented through `GET /api/v1/growth/evidence/audit`. |
| Learning-cycle audit aggregate | `learning-cycle-audit-service` | Composes plan, plan publish-attempt, evidence, profile-delta, and correction public readbacks into one Owner-safe cycle DTO and timeline. | Implemented through `GET /api/v1/growth/learning-cycles/audit`. |
| Learning-cycle history readback | `learning-cycle-history-service` | Composes public plan-audit, evidence-audit, profile-delta-audit, correction, and optional completeness readbacks into bounded summary-only cycle rows for Owner selection. | Implemented through `GET /api/v1/growth/learning-cycles/history` and `npm run smoke:cycle-history`. Browser richer history controls remain pending. |
| Audit completeness readback | `learning-audit-completeness-service` | Evaluates required audit evidence over the public cycle DTO: published plan, publish-attempt visibility, evaluation evidence, profile-delta audit, downstream partial failures, and privacy projection. | Implemented through `GET /api/v1/growth/learning-cycles/completeness`. |
| Profile V2 | `learning-profile-v2-service` | Read projection over ledger and optional legacy profile summary, including stale-evidence freshness and low-pressure review hints for stale claims. | Implemented. |
| Profile delta audit | `learning-profile-delta-service`, `profile-delta-audits.js` | Post-evaluation before/after audit for Owner review, including changed capability state and evidence-freshness changes. | DTO and durable repository implemented. |
| Owner profile correction | `learning-owner-correction-service`, `evidence-ledger.js` | Owner-reviewed correction/confirmation evidence that Profile V2 can absorb without deleting history. | Implemented through `POST`/`GET /api/v1/growth/profile-corrections`. |
| Trajectory recommendation | `learning-card-trajectory-service`, mastery profile repository | Records strategy, outcome, and next recommendation lifecycle. | Implemented. |
| Stage cycle | `learning-stage-assessment-service`, `stage-assessment-cycles.js` | Formal assessment activation/completion/cooldown. | Implemented. |

## Supervised Automation Proposal Contract

The proposal layer is the first safe automation step. It reduces manual
repetition by creating an auditable next-learning proposal, but it leaves
publication under Owner control.

Input contract:

- target workspace, learner id, program id, horizon, domain pack, domain,
  subject, time budget, optional target nodes, and requester;
- at least one source-cycle id from the previous cycle:
  `sourcePlanDraftId`, `sourceTaskCardId`, `sourceEvaluationId`,
  `profileDeltaId`, `evidenceId`, `correctionId`, or `sourceId`;
- no raw learner answers, transcripts, raw prompts, answer keys, raw model
  output, source-document bodies, private paths, secrets, tokens, cookies, or
  provider configuration.

Service flow:

1. `learning-automation-proposal-service` validates workspace scope and scans
   input for privacy-risk keys.
2. It requires a source-cycle id and calls
   `learning-audit-completeness-service.evaluateCycleCompleteness`.
3. It fails closed before planning if completeness is missing, partial failure
   blocks trust, or privacy projection is not acceptable.
4. It calls `learning-target-provisioning-service.resolveSelection` before
   plan drafting.
5. It calls `learning-plan-publisher-service.draftPlan` to create a validated
   summary-only plan draft.
6. It selects one proposal item and writes
   `learning_growth_automation_proposals` through the repository boundary.
7. It returns the stored proposal, selected item, completeness summary,
   target-provisioning summary, and an explicit Owner publish action.

Owner decision flow:

1. `POST /api/v1/growth/automation/proposals/:proposalId/decision` is
   Owner-only, workspace-bearer authorized, and visible-target scoped.
2. The route delegates to `learning-automation-proposal-service.reviewProposal`
   and must not perform proposal status policy in the route.
3. The service accepts only terminal review statuses: `accepted`, `skipped`,
   `expired`, and `superseded`.
4. The repository records bounded decision metadata in
   `learning_growth_automation_proposals`: decision JSON, `reviewed_by`,
   `decided_at`, and the final proposal status.
5. `accepted` returns the same explicit Owner publish action as proposal
   creation, but it does not publish the card.
6. Repeating the same terminal decision is idempotent; attempting a different
   terminal decision after review fails with
   `learning_automation_proposal_already_decided`.

Accepted publish execution flow:

1. `POST /api/v1/growth/automation/proposals/:proposalId/publish` is
   Owner-only, workspace-bearer authorized, and visible-target scoped.
2. The route delegates to
   `learning-automation-proposal-service.publishAcceptedProposal`.
3. The service loads the scoped proposal from the repository and requires
   `status=accepted`; proposed, skipped, expired, and superseded proposals
   fail closed with `learning_automation_proposal_not_accepted`.
4. The service delegates publication only to
   `learning-plan-publisher-service.publishPlanItem` using the proposal's
   stored `planDraftId` and `selectedItemId`.
5. The repository records bounded execution metadata in
   `learning_growth_automation_proposals`: execution JSON, `executed_by`, and
   `executed_at`.
6. A successful execution is idempotent. Repeating the publish call after
   `execution.status=published` returns the stored proposal and does not call
   the plan publisher again.
7. A failed or blocked publish attempt remains visible on the proposal
   execution metadata and on the existing plan publish-attempt audit.
   Failed executions may be retried by an explicit Owner publish action.

Repository guard:

- `automation-proposals.js` rejects privacy-risk keys before writing;
- `privacyClass` must be `summary_only`;
- duplicate proposal saves return the original public proposal DTO;
- legacy proposal tables are migrated by adding bounded decision columns when
  they are missing;
- legacy proposal tables are migrated by adding bounded execution columns when
  they are missing;
- decision writes reject invalid statuses, missing scoped proposal ids, and
  privacy-risk decision payloads;
- execution writes reject invalid statuses, unaccepted proposals, missing
  scoped proposal ids, and privacy-risk execution payloads;
- public DTOs do not expose raw table internals.

Output contract:

- proposal id, workspace id, learner id, program id, horizon, status;
- source-cycle summary and source ids;
- new plan draft id and selected item id;
- target node ids;
- bounded rationale and policy;
- bounded decision metadata: `decision`, `reviewedBy`, and `decidedAt`;
- bounded execution metadata: `execution`, `executedBy`, and `executedAt`;
- `ownerReviewRequired=true`, `dryRunOnly=true`, `autoPublish=false`,
  `publishRequiresOwnerAction=true`, and
  `requiresAuditCompleteness=true`.

Forbidden behavior:

- no direct Gateway calls from the proposal service;
- no direct card-generation, authoring, or evaluation calls;
- no direct SQLite table access from routes;
- no formal stage-assessment activation;
- no background scheduling;
- no automatic publish after proposal creation or after an Owner decision.

Accepted proposal execution must continue through the existing
`learning-plan-publisher-service.publishPlanItem` service boundary, which is
also exposed by `POST /api/v1/growth/learning-plans/:planDraftId/publish`.

## Scheduler Dry-Run Contract

The scheduler dry-run layer is the first scheduling-adjacent backend slice. It
is intentionally read-only.

Input contract:

- Owner actor only;
- workspace bearer authorization for the Owner's current workspace;
- Growth visible-target scope for the target learner workspace;
- target workspace, learner id, program id, optional plan draft id, target
  selectors, and bounded limit;
- no raw learner answers, transcripts, prompts, raw model output, source
  bodies, private paths, secrets, tokens, cookies, or provider configuration.

Service flow:

1. `learning-automation-scheduler-service` scans input for privacy-risk keys.
2. It lists `status=accepted` proposals through
   `learning-automation-proposal-service.listProposals`.
3. It skips proposals whose execution status is already `published`.
4. For each remaining accepted proposal, it rechecks source-cycle
   completeness through
   `learning-audit-completeness-service.evaluateCycleCompleteness`.
5. If the source cycle is no longer ready, it returns `blocked_audit`.
6. If the source cycle is ready, it rechecks target provisioning through
   `learning-target-provisioning-service.resolveSelection`.
7. If target provisioning fails, it returns `blocked_provisioning`.
8. If both checks pass, it returns `would_publish` plus the explicit proposal
   publish action that Owner or a future writeful worker may call separately.

Output contract:

- `dryRun=true`;
- `writePlanned=false`;
- `writesPerformed=false`;
- `publishPlanned=false`;
- bounded summary counts for inspected, would-publish, blocked, and skipped
  candidates;
- candidate DTOs with proposal id, plan draft id, selected item id, target
  nodes, decision, reason, completeness summary, provisioning summary, and
  explicit publish action.

Forbidden behavior:

- no Gateway calls;
- no `learning-plan-publisher-service.publishPlanItem`;
- no `learning-automation-proposal-service.publishAcceptedProposal`;
- no proposal execution writes;
- no card generation, authoring, or evaluation;
- no notification, Action Inbox, queue, worker, or stage-assessment
  activation;
- no direct SQLite table access from the route or scheduler service.

## Model-Entered Steps

Only these steps enter a model:

| Step | Service | Input | Draft output | Write gate |
| --- | --- | --- | --- | --- |
| Plan | `learning-plan-orchestrator-service` | Profile V2 summary, stale-evidence summaries, recent evidence summaries, graph candidate summaries, target provision, horizon, low-pressure constraints. | `growth.learningPlanDraft.v1`. | `learning-plan-validation-service` before `learning-plan-publisher-service` stores a draft. |
| Author | `learning-card-authoring-service` | Validated `learningGraphPlan` or validated planner item, summary-only graph/history/profile context, card role, difficulty, evidence requirements. | Versioned authoring draft with `teachingFlow`. | Authoring validation before `card-authoring-publisher` writes card rows. |
| Evaluate | `learning-card-evaluation-service` | Current submitted evidence for the current card, policy, target graph nodes, bounded audio metadata. | `growth.card.evaluation.v1`. | Evaluation validation before `growth-evaluation-service` writes evaluation and downstream state. |

Planning and authoring must not receive raw historical answers or transcripts.
Evaluation may receive only the current authenticated answer payload needed for
grading that card.

## Daily Cards And Stage Assessments

Daily practice cards:

- expected duration: 10-15 minutes;
- roles: `teaching`, `practice`, `repair`, `stretch`, or mapped supported
  generation roles;
- one active submission box;
- one evaluation;
- one optional reflection;
- completion after first evaluation regardless of score;
- low or medium evidence weight;
- score-proportional reward;
- low score becomes planning evidence, not a retry gate.

Stage assessment cards:

- expected duration: 25-30 minutes;
- role: `stage_assessment`;
- activation only through `learning-stage-assessment-service`;
- explicit coverage nodes;
- high evidence weight;
- separate cooldown lifecycle;
- no silent publication from daily planning.

The two card families update the same profile loop with different evidence
weights. Daily cards provide frequent weak-to-medium observations and learner
experience signals. Stage assessments provide lower-frequency high-confidence
observations over declared coverage nodes. The planner should therefore use
daily cards for practice, repair, confidence-building, and new-node sampling,
and use stage assessments only when evidence freshness, confidence, and
cooldown policy justify a formal checkpoint.

Daily low scores must not create a child-facing failure gate. They should
instead become planner evidence for a future repair card, lower confidence,
misconception, or Owner review. Formal assessment results can shift Profile V2
more strongly, but still remain auditable and correctable rather than deleting
prior evidence.

## First Cross-Subject Vertical

The first generalized vertical is Fanfan science because it proves the loop is
not English-specific while keeping target scope controlled.

Operational path:

1. Owner selects Fanfan, the UK/HK curriculum foundation domain pack,
   `domain=science`, `subject=science`, `horizon=daily_plan`, and
   `availableMinutes=15`.
2. Growth loads generation context and shows graph options, target
   provisioning, Profile V2, evidence audit, and Gateway readiness.
3. Owner drafts a plan through `POST /api/v1/growth/learning-plans/draft`.
4. Owner publishes one selected plan item through
   `POST /api/v1/growth/learning-plans/:planDraftId/publish`.
5. The learner completes the card through the existing card detail.
6. Evaluation writes evidence, Profile V2 changes, trajectory, and profile
   delta.
7. Owner audit explains the plan basis, evidence basis, profile delta,
   Owner-reviewed corrections, and next recommendation.

## Next Implementation Slices

### Slice A: Durable profile-delta audit

Status: implemented locally on 2026-06-15.

Goal: make post-evaluation profile deltas queryable and auditable after the
evaluation response has gone away.

Implemented repository:

- `src/stores/growth-learning-sqlite/profile-delta-audits.js`;
- store facade property: `profileDeltaAuditRepository`;
- service dependency injection into `learning-profile-delta-service`.
- read service: `src/services/learning-profile-delta-audit-service.js`;
- read route: `GET /api/v1/growth/profile-delta-audits`.

Implemented table: `learning_growth_profile_delta_audits`.

Minimum fields:

- `profile_delta_id`;
- `workspace_id`;
- `learner_id`;
- `program_id`;
- `task_card_id`;
- `submission_id`;
- `evaluation_id`;
- `target_node_ids_json`;
- `evidence_ids_json`;
- `changed_capability_count`;
- `profile_state_changed`;
- `before_summary_json`;
- `after_summary_json`;
- `summary_json`;
- `changed_capabilities_json`;
- `planner_hint_change_json`;
- `raw_json`;
- `privacy_class`;
- `created_at`;
- `updated_at`.

Acceptance:

- evaluation processing persists the bounded delta after ledger/profile writes;
- duplicate processing is idempotent by evaluation id;
- persistence failure is visible and non-fatal;
- public DTOs are summary-only;
- raw/private markers are rejected;
- repository/service/evaluation/AI-loop harness proves persistence and
  non-duplication.
- the read route is constrained by Growth view-target visibility and supports
  bounded filters for learner, program, task card, evaluation, profile-delta
  id, and limit.

Implemented harness additions:

- `tests/learning-profile-delta-audit-repository.test.js`;
- `tests/learning-profile-delta-audit-service.test.js`;
- update `tests/learning-profile-delta-service.test.js`;
- update `tests/growth-evaluation-service.test.js`;
- update `tests/growth-routes.test.js`;
- update `tests/learning-card-ai-loop-harness.test.js`;
- update `tests/growth-architecture-boundary.test.js`.

### Slice B: Embedded Owner planner and provision UI

Goal: make Fanfan science card generation possible from the Growth `生成` tab
without Codex.

Acceptance:

- UI renders `graphOptions`, `targetProvisioning`, Profile V2, evidence audit,
  planner readiness, authoring readiness, and evaluation readiness;
- UI blocks or explains non-provisioned targets instead of silently failing;
- Owner can draft a plan, inspect a validated preview, and explicitly publish
  one item;
- UI preserves the published card preview while refreshing context after
  publish;
- UI never calls Gateway directly and never computes profile diffs from raw
  payloads;
- mobile scroll, dark mode contrast, and progress status are validated by the
  central Home AI visual toolchain before production deploy.

Required harness:

- focused API/client/context tests;
- frontend adapter/layout tests;
- central embedded-plugin visual harness for Growth.

### Slice B2: Owner profile correction backend

Status: implemented locally on 2026-06-15.

Goal: make Owner audit actionable without letting browser code mutate Profile
V2 directly.

Implemented service and route boundary:

- `src/services/learning-owner-correction-service.js`;
- `POST /api/v1/growth/profile-corrections`;
- `GET /api/v1/growth/profile-corrections`.

Acceptance:

- only Owner role can write corrections;
- target visibility passes before cross-learner writes;
- `learning-target-provisioning-service` validates the selected graph context
  before any evidence write;
- correction evidence is stored as `sourceType=owner_reviewed_correction` in
  `learning_growth_evidence_ledger`;
- `learning-profile-v2-service` applies correction evidence as an auditable
  state adjustment without deleting previous evaluation or stage evidence;
- readback groups correction evidence by correction id and returns only bounded
  public DTOs;
- privacy-risk fields are rejected before ledger writes.

Implemented harness additions:

- `tests/learning-owner-correction-service.test.js`;
- update `tests/learning-profile-v2-service.test.js` through the service
  vertical;
- update `tests/growth-routes.test.js`;
- update `tests/growth-architecture-boundary.test.js`.

### Slice B3: Owner audit readback context

Status: implemented locally on 2026-06-15.

Goal: let the Owner generation context expose a single bounded audit readback
surface for later UI rendering.

Implemented service projection:

- `learning-card-generation-context-service` now returns `ownerAudit`;
- `ownerAudit.planAudit` reads public DTOs through
  `learning-plan-audit-service`;
- `ownerAudit.profileDeltaAudit` reads public DTOs through
  `learning-profile-delta-audit-service`;
- `ownerAudit.profileCorrections` reads public DTOs through
  `learning-owner-correction-service`;
- the context service projects only bounded ids, timestamps, status, plan
  item, generated-card, generated-graph-plan, summary, changed-capability,
  evidence-freshness, stale-reason, and correction fields.

Acceptance:

- context readback is target-workspace scoped;
- plan-draft readback is service-owned and `GET
  /api/v1/growth/learning-plans/audit` delegates to
  `learning-plan-audit-service` instead of exposing the
  `learning_growth_plan_drafts` table through routes or browser code;
- context readback does not recompute profile diffs from raw profile
  snapshots;
- raw model output, transcripts, answers, source-document bodies, and private
  paths are not projected;
- service wiring is explicit in `src/app/services.js`;
- focused context and architecture harnesses prove the projection.

### Slice B4: Evidence audit readback route

Status: implemented locally on 2026-06-15.

Goal: let Owner and workspace-scoped audit views inspect bounded evidence
history without depending on a single generation-context DTO.

Implemented service and route boundary:

- `src/services/learning-evidence-audit-service.js`;
- `GET /api/v1/growth/evidence/audit`;
- extended `learning_growth_evidence_ledger` repository listing filters for
  evidence id, source id, task-card id, card role, and status.

Acceptance:

- route readback is constrained by Growth view-target visibility;
- the route delegates to `learning-evidence-audit-service.listEvidenceAudit`;
- filters include learner, program, evidence id, source type, source id,
  task-card id, card role, status, target node ids, and limit;
- public DTOs include bounded ids, source metadata, graph node ids, score band,
  status, evidence weight/confidence, timestamps, and summary-only audit
  fields;
- raw answers, transcripts, prompts, model output, source bodies, private
  paths, and provider configuration are not projected;
- routes do not expose the `learning_growth_evidence_ledger` table directly.

### Slice B5: Learning-cycle audit aggregate

Status: implemented locally on 2026-06-15.

Goal: let Owner inspect one completed or in-progress learning cycle through a
single bounded read surface instead of stitching plan, evidence, profile-delta,
and correction readbacks in browser code.

Implemented service and route boundary:

- `src/services/learning-cycle-audit-service.js`;
- `GET /api/v1/growth/learning-cycles/audit`.

The service should compose existing public audit services:

- `learning-plan-audit-service`;
- `learning-evidence-audit-service`;
- `learning-profile-delta-audit-service`;
- `learning-owner-correction-service`.

Acceptance:

- route readback is constrained by Growth view-target visibility;
- route code delegates to `learning-cycle-audit-service` and does not inspect
  SQLite tables directly;
- filters include learner, program, task card, evaluation, plan draft, target
  nodes, and limit;
- the response includes bounded summary counts, selected plan links, evidence
  ids, profile-delta ids, correction ids, and a timeline of plan/evidence/
  profile/correction events;
- raw answers, transcripts, prompts, model output, source bodies, private
  paths, and provider configuration are not projected;
- partial downstream read failure is visible in the aggregate and does not
  cause browser code to retry hidden table reads.

Implemented harness additions:

- `tests/learning-cycle-audit-service.test.js`;
- route tests in `tests/growth-routes.test.js`;
- architecture guard updates in `tests/growth-architecture-boundary.test.js`.

### Slice C: Production planner readiness

Goal: verify real Gateway planner config before enabling planner UI in
production.

Acceptance:

- `npm run smoke:planner-readiness` passes with real target selectors;
- output contains only bounded readiness/context/draft summaries;
- LaunchDaemon environment contains planner endpoint/protocol/token references
  by secure location only;
- no raw prompts, raw planner output, learner answers, transcripts, private
  paths, or provider config appear in logs or handoff.

### Slice D: Weekly and stage-checkpoint planning

Goal: expand beyond one-card daily planning without creating backlog pressure.

Backend status: horizon-policy validation, read-only stage-readiness
projection, and stage-checkpoint direct-publish blocking are implemented
locally. UI rendering and production planner smoke remain later.

Acceptance:

- `weekly_plan` produces a short, low-pressure sequence;
- missed days do not create automatic homework debt;
- stage checkpoint suggestions remain suggestions until
  `learning-stage-assessment-service` activates a formal cycle;
- stage readiness uses profile confidence, evidence freshness, and cooldown.

Implemented backend safeguards:

- `learning-planner-context-service` defaults `weekly_plan` and `repair_plan`
  to `daily_score_once` low-pressure card roles and includes bounded
  `stageAssessment` readiness by calling the read-only
  `learning-stage-assessment-service.stageReadiness()` path;
- `learning-plan-validation-service` rejects weekly backlog pressure,
  overlong weekly items, weekly formal-assessment items, and stage-checkpoint
  drafts without an explicit `learning-stage-assessment-service` activation
  policy;
- `learning-plan-publisher-service` returns
  `stage_assessment_activation_required` instead of calling card generation
  when a selected plan item is a formal stage assessment.

### Slice E: Multi-workspace and domain-pack generalization

Goal: support any authorized and provisioned learner/domain pack.

Acceptance:

- Owner actor workspace and target learner workspace are always separate;
- non-sample targets require active provisions;
- graph nodes must belong to the selected provisioned graph context;
- public context and audit projections never mix Owner data into learner
  profile/evidence/plan state;
- route and UI tests cover cross-workspace denial and success paths.

Backend harness status:

- `tests/learning-card-ai-loop-harness.test.js` now includes a non-sample
  science vertical. It proves unprovisioned draft/direct generation are blocked
  before model calls, Owner-created provision enables the same pipeline, wrong
  subject remains blocked, graph plan/card raw audit retain `domainPackId`, and
  persisted ledger/profile rows stay under the target learner workspace.

## Harness Matrix

Run the narrow harness first for the touched boundary, then the broad local
gate.

| Boundary | Required checks |
| --- | --- |
| Profile delta durable audit | `node --test tests/learning-profile-delta-audit-repository.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-profile-delta-service.test.js tests/growth-evaluation-service.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Owner profile correction backend | `node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-owner-correction-service.test.js tests/learning-profile-v2-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Owner audit readback context | `node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-card-generation-context-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-owner-correction-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Owner daily-loop backend facade | `node --test tests/learning-daily-loop-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-cycle-audit-service.test.js tests/learning-audit-completeness-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Learning-cycle audit aggregate | `node --test tests/learning-cycle-audit-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-owner-correction-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Learning-cycle history readback | `node --test tests/learning-cycle-history-service.test.js tests/growth-cycle-history-smoke-script.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` and `npm run smoke:cycle-history`; the CLI defaults to no-write summary-only history over the normal service graph. |
| Audit completeness readback | `node --test tests/learning-audit-completeness-service.test.js tests/learning-cycle-audit-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation proposal | `node --test tests/learning-automation-proposal-repository.test.js tests/learning-automation-proposal-service.test.js tests/growth-automation-proposal-smoke-script.test.js tests/learning-audit-completeness-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` and `npm run smoke:proposal`; the CLI defaults to read-only list and gates create/review/publish with explicit `--allow-write`. |
| Scheduler dry-run | `node --test tests/learning-automation-scheduler-service.test.js tests/learning-automation-proposal-service.test.js tests/learning-audit-completeness-service.test.js tests/learning-target-provisioning-service.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`; the AI-loop harness proves a completed Fanfan science accepted proposal becomes one read-only `would_publish` candidate. |
| Automation digest | `node --test tests/learning-automation-digest-repository.test.js tests/learning-automation-digest-service.test.js tests/learning-automation-scheduler-service.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`; the AI-loop harness proves a completed Fanfan science cycle can produce an accepted proposal, read-only `would_publish` scheduler candidate, and pending digest required action without publication. |
| Automation failure policy | `node --test tests/learning-automation-failure-policy-repository.test.js tests/learning-automation-failure-policy-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation action handoff | `node --test tests/learning-automation-action-handoff-repository.test.js tests/learning-automation-action-handoff-service.test.js tests/growth-event-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation scheduler execution | `node --test tests/learning-automation-scheduler-execution-repository.test.js tests/learning-automation-scheduler-execution-service.test.js tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation scheduler run | `node --test tests/learning-automation-scheduler-run-repository.test.js tests/learning-automation-scheduler-run-service.test.js tests/learning-automation-scheduler-execution-service.test.js tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation release readiness | `node --test tests/learning-automation-release-readiness-repository.test.js tests/learning-automation-release-readiness-service.test.js tests/learning-automation-release-evidence-bundle-service.test.js tests/growth-release-readiness-smoke-script.test.js tests/growth-release-evidence-bundle-script.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Operating-loop backend | `node --test tests/learning-evidence-ledger-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-profile-v2-service.test.js tests/learning-owner-correction-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-repository.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-profile-delta-service.test.js tests/learning-planner-context-service.test.js tests/learning-plan-orchestrator-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-target-provisioning-service.test.js tests/growth-planner-readiness-smoke-script.test.js tests/learning-graph-repository.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-evaluation-service.test.js tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Owner planner/provision UI | `node --test tests/learning-card-generation-context-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-target-provisioning-service.test.js tests/growth-routes.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js` |
| Card authoring boundary | `node scripts/check-growth-card-authoring-boundary.js && node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-routes.test.js` |
| Documentation locality | `node scripts/check-growth-docs-locality.js && node --test tests/growth-docs-locality.test.js` |
| Full local gate | `npm run check && npm test && git diff --check` |

Visual release gate for embedded UI work:

```bash
cd /Users/hermes-dev/HermesMobileDev/app
npm run ios:pwa:visual -- \
  --scenario embedded-plugin-shell \
  --plugin-id growth \
  --debug-url http://127.0.0.1:19073/
```

## Definition Of Done

The operating loop is product-complete only when:

- every generated card starts from a graph plan or validated planner item;
- every model boundary returns a validated draft before any durable write;
- Owner can inspect target provision, plan reason, evidence basis, Profile V2,
  persisted profile delta, Owner-reviewed corrections, and next recommendation
  without raw private payloads;
- daily cards stay low-pressure and complete after the first evaluation;
- formal assessment cards stay separate, high-weight, cooldown-aware, and
  service-activated;
- non-sample generation requires explicit target/domain-pack provisioning;
- failed model output, failed validation, timeout, and DB failure produce
  visible bounded states rather than silent no-ops;
- service, route, UI, docs-locality, and central visual harness evidence exist
  for the shipped slice.
