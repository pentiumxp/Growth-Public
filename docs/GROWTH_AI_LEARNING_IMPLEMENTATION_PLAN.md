# Growth AI Learning Implementation Plan

Last updated: 2026-06-15.

## Purpose

This document is the execution plan for building Growth into a supervised,
AI-guided learning system. It turns the product direction in
`docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` and the closed-loop contract in
`docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` into ordered implementation
packages.

The plan starts with Fanfan and the imported UK/HK curriculum foundation graph,
but the architecture must support any authorized learner workspace, domain
pack, subject, and knowledge graph after view-target visibility and target
provisioning both pass.

This document is not a replacement for the existing detailed contracts:

- use `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` as the system scheme and
  product thesis;
- use `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` as the closed-loop
  contract;
- use `docs/GROWTH_AI_LEARNING_ROADMAP.md` for capability levels and release
  gates;
- use `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` to choose the immediate
  next-stage path: product-visible Owner daily loop first, or a backend-only
  release-readiness evidence gate that cannot enable scheduling;
- use `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` for service,
  state, DTO, and harness-level contracts;
- use `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` and
  `docs/GROWTH_CARD_INTERACTION_FLOW.md` for embedded UI behavior;
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` before any
  scheduling-adjacent, notification, Action Inbox, rollback, or writeful
  automation work;
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md` before changing
  automation notification/action handoff records or delivery behavior;
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` before
  changing Owner-explicit scheduler execution routes, services, repositories,
  or config gates.
- use `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` before
  changing supervised scheduler run/tick behavior, background scheduler config,
  run persistence, or any future worker.

## Target Outcome

Growth should become a low-pressure learning operating loop:

1. observe summary-only learner evidence;
2. project the current learner profile from durable records;
3. plan the next learning action through Gateway;
4. validate and store the plan as an Owner-auditable draft;
5. explicitly publish one selected daily item or activate a formal checkpoint;
6. author the card through Gateway;
7. let the learner complete the card;
8. evaluate the current evidence once through Gateway;
9. write evaluation, reward, evidence, profile, trajectory, and profile-delta
   audit records;
10. let Owner inspect and correct the audit;
11. use the updated profile, evidence, profile-delta audit, and trajectory
    recommendation for the next plan.

The product goal is not simply more generated cards. The product goal is a
closed loop where each next card can be explained from durable, bounded,
summary-only state.

## Non-Negotiable Boundaries

Growth must keep these boundaries during every implementation slice:

- Service First: routes parse requests, enforce authorization, resolve visible
  targets, call services, and format bounded responses. Business policy lives
  in Growth services.
- Gateway only: Growth does not call OpenAI, Claude, DeepSeek, or other model
  vendors directly. Planning, authoring, and evaluation use Growth Gateway
  clients.
- Draft before write: model responses become drafts first. Validation must pass
  before a plan, card, evaluation, or profile effect becomes durable state.
- Summary-only state: persistent loop records and public DTOs must not include
  raw historical answers, full transcripts, raw prompts, raw model output,
  hidden answer keys, source-document bodies, private paths, credentials,
  cookies, tokens, or provider configuration.
- Owner supervision: daily publication, formal assessment activation,
  correction, proposal decisions, and later automation policy remain
  auditable Owner actions until the required safety gates exist.
- Low pressure: daily cards use one submission, one evaluation, one optional
  reflection, completion after first evaluation, score-proportional rewards,
  and no retry-until-pass gate.
- Formal separation: stage assessment cards are formal checkpoints with
  explicit coverage, high evidence weight, activation, completion, and
  cooldown owned by `learning-stage-assessment-service`.
- Actor/target separation: Owner actor workspace and learner target workspace
  stay separate in service inputs, repository writes, route tests, and UI
  state.
- Central platform compliance: broad platform contracts remain in the Home AI
  app workspace. Growth-local docs store Growth product, architecture, service,
  and harness facts only.

## Current Capability Baseline

As of this document version, the backend has the main foundations for the
AI-driven loop:

- native knowledge-graph import, graph plans, graph bindings, graph option
  projection, and domain-pack/subject provenance;
- target/domain-pack provisioning service and repository;
- Gateway-backed authoring and evaluation boundaries, with deterministic local
  fallback for evaluation harness/local isolation;
- `daily_score_once` generated-card learner flow;
- formal stage-assessment activation, generated formal cards, higher-weight
  evidence, completion, and cooldown;
- summary-only evidence ledger and bounded evidence audit readback;
- Profile V2 projection with daily versus formal evidence freshness;
- planner context, Gateway planner client, validation, draft persistence,
  publish bridge, and no-write planner readiness smoke;
- plan audit, cycle audit, selectable cycle history, audit completeness,
  profile-delta audit, and Owner correction readback services and routes;
- Owner daily-loop backend facade for preview, draft, and publish;
- service-level Fanfan science vertical harness from planner draft through
  card publication, learner evidence, evaluation, ledger, Profile V2, and
  profile delta, plus no-write profile-feedback evidence proving the completed
  cycle can feed the next recommendation and loop state;
- non-sample provisioned science vertical harness proving target provisioning
  and target-workspace scoped writes;
- supervised automation proposal backend, accepted-proposal explicit publish,
  read-only scheduler dry-run, automation digest backend, rollback/failure
  policy backend, automation action handoff backend, and default-disabled
  Owner-explicit scheduler execution backend;
- default-disabled scheduler run/tick backend, default-disabled worker lease
  backend, and Owner-reviewed worker target configuration backend. The worker
  target service stores summary-only proposed/enabled/disabled/archived target
  rows and treats environment JSON targets as local fallback rather than
  production approval;
- release-readiness evidence backend for summary-only readiness evaluation and
  Owner-created snapshots. This boundary is advisory, keeps
  `writefulSchedulingAllowed=false`, and is not a runtime release switch.

The product is not complete because several browser and automation-safety
surfaces are still missing:

- Owner planner/provision UI is not fully product-closed;
- Owner audit/correction UI is not fully rendered from the implemented DTOs;
- proposal review UI and digest review UI remain future work;
- rollback/failure policy backend is implemented as a scheduling-readiness
  prerequisite; Growth-owned automation action handoff backend is implemented,
  and the default-disabled Owner-explicit scheduler execution backend is
  implemented, but platform Action Inbox/Web Push product UI and central
  visual evidence are not complete;
- background writeful scheduling remains blocked;
- production planner readiness smoke and central embedded-plugin visual
  evidence are required before UI release.

## Program-Level Workstreams

Implementation should proceed through workstreams that can be verified
independently. The workstreams are ordered by evidence dependency, not by the
amount of code that already exists.

| Workstream | Goal | Must be true before it is considered closed |
| --- | --- | --- |
| W1: Scope, graph, and provisioning | Owner selects an authorized learner, domain pack, domain, subject, horizon, and time budget. | View-target authorization, explicit provision checks, graph option projection, wrong-subject blocking, and target-workspace row ownership are covered by service, route, and vertical harnesses. |
| W2: Daily learning action | Owner publishes one low-pressure daily card and learner completes it. | `daily_score_once`, one submission, one evaluation, one optional reflection, audio record/playback, score-proportional reward, visible progress, and visible failure state are covered by backend and UI harnesses. |
| W3: Audit, profile, and correction | Owner can explain what happened and adjust future learning evidence. | Evidence ledger, Profile V2, profile delta, cycle audit, selectable cycle history, audit completeness, correction read/write, privacy projection, next recommendation, post-cycle `growth.learningLoopState.v1`, `npm run smoke:cycle-history`, and `npm run smoke:owner-audit` are rendered or exercised from service DTOs. |
| W4: Formal checkpoint | Stage assessment updates profile confidence without becoming ordinary daily pressure. | Stage readiness, coverage, activation, completion, cooldown, high-weight evidence, and direct daily-publish blocking are proven through `learning-stage-assessment-service`. |
| W5: Generalized targets | The same loop runs outside the Fanfan sample. | Visible but unprovisioned targets fail closed; explicit provisioning enables; actor and target workspaces remain separate; graph provenance matches selected domain pack and subject. |
| W6: Supervised automation | Growth can propose and review repeated next actions without hiding Owner decisions. | Proposal, digest, failure policy, action handoff, Owner-explicit execution, scheduler run, worker target, and worker lease boundaries remain summary-only, default-disabled where required, and forbidden from direct Gateway/card/stage mutation. |
| W7: Release evidence and operations | A human can inspect whether production automation prerequisites are present. | Release-readiness checks, platform Action Inbox/Web Push evidence, central visual evidence, production planner readiness smoke, production Owner audit smoke, production controlled daily-loop write smoke, production learner-cycle audit smoke, production scheduler dry-run evidence, reviewed worker targets, config approvals, docs, and broad harnesses are complete. |

Sequencing rule:

- W1 through W3 are the minimum product loop. Do not treat automation as ready
  while Owner cannot create a daily card, watch it complete, and audit the
  resulting profile delta from the browser.
- W4 can run in parallel with UI polish only when it remains a separate formal
  checkpoint path.
- W6 and W7 can add evidence and disabled backends, but they must not enable
  writeful scheduling before W1, W2, W3, product UI, central visual evidence,
  and release approvals are complete.

## Closure Ladder

Implementation status should be reported by closure level. This avoids
confusing a backend-capable slice with a product-complete learning system.

| Level | Closed capability | Required proof |
| --- | --- | --- |
| L0: Data foundation | Growth can import or read graph/profile/evidence foundations for a target. | Native graph import/readback, target provisioning, summary-only privacy checks, and target-workspace ownership tests. |
| L1: Backend daily loop | Services can draft, publish, evaluate, record evidence, update profile projections, audit one daily card, and expose the next planning action from the completed cycle. | Service/route/repository/vertical harnesses prove the loop without browser reconstruction or direct model calls outside Gateway clients. |
| L2: Browser daily loop | Owner and learner can complete the same daily loop from the embedded plugin. | UI progress/errors, mobile scroll, dark-mode contrast, audio playback, one-box-per-stage flow, and central visual evidence. |
| L3: Audit/correction loop | Owner can inspect why the card happened and add correction evidence. | Cycle audit, evidence audit, profile-delta audit, correction read/write, completeness, `tests/growth-owner-audit-smoke-script.test.js`, and privacy UI tests. |
| L4: Checkpoint loop | Formal stage checkpoints update profile confidence without becoming daily pressure. | Stage readiness, activation, coverage, completion, cooldown, direct daily-publish blocking, and formal evidence weight tests. |
| L5: Generalized program | The loop works for another visible and explicitly provisioned learner/domain. | Non-sample vertical harness, actor/target separation, wrong-subject blocking, and graph provenance checks. |
| L6: Supervised automation | Growth can propose, review, digest, hand off, and Owner-explicitly execute one action behind disabled gates. | Proposal/digest/failure-policy/action/execution/run/worker-target harnesses and UI evidence, with no hidden publication. |
| L7: Release-reviewable automation | A human can inspect platform, visual, production dry-run, target, config, and approval evidence. | Release-readiness snapshots, central visual evidence, Action Inbox/Web Push evidence, production smokes, reviewed targets, and explicit approvals. |

The next engineering package should always name the closure level it advances.
A slice that adds L6 or L7 evidence does not advance the product loop unless L2
and L3 are also browser-operable.

## Model-Entered Steps

Only these Growth steps may enter a model, and every step goes through
Gateway:

| Step | Service boundary | Model input | Draft output | Durable write gate |
| --- | --- | --- | --- | --- |
| Plan | `learning-plan-orchestrator-service` and `growth-gateway-planner-client` | Profile V2 summary, stale-evidence summaries, recent evidence summaries, graph candidates, target provisioning, horizon, time budget, and low-pressure policy. | `growth.learningPlanDraft.v1`. | `learning-plan-validation-service`; then `learning-plan-publisher-service` stores a draft. |
| Author | `learning-card-authoring-service` and `growth-gateway-authoring-client` | Validated planner item or `learningGraphPlan`, bounded graph/history/profile summaries, role, difficulty, support level, and evidence requirements. | Versioned card authoring draft with `teachingFlow`. | `learning-card-authoring-validation-service`; then `card-authoring-publisher` writes the card and graph binding transactionally. |
| Evaluate | `learning-card-evaluation-service` and `growth-gateway-evaluation-client` | Current authenticated learner evidence for the current card, bounded audio metadata, card policy, graph metadata, and current stage policy. | `growth.card.evaluation.v1`. | Evaluation validation; then `growth-evaluation-service` writes evaluation and downstream records. |

All other steps are deterministic service behavior: provisioning, graph
filtering, validation, publication, reward settlement, evidence-ledger writes,
Profile V2 projection, profile-delta audit, stage cooldown, proposal decisions,
digest review, and action handoff delivery metadata.

## Product Flow

### Daily Practice

Daily practice is the routine learning loop.

Rules:

- expected duration: 10-15 minutes;
- one active submission box;
- one evaluation;
- one optional reflection;
- completion after the first evaluation regardless of score;
- low or medium evidence weight;
- score-proportional reward;
- low score becomes planning evidence, not a child-facing failure gate.

Implementation implication:

- direct generation and planner-backed publication both must set
  `daily_score_once`;
- the learner UI must not create multiple active text boxes for one stage;
- evaluation retry exhaustion is a visible Owner-reviewable failure, not a
  hidden waiting state;
- future plans can repair weak evidence without forcing immediate resubmission.

### Stage Assessment

Stage assessments are formal checkpoints.

Rules:

- expected duration: 25-30 minutes;
- activation only through `learning-stage-assessment-service`;
- explicit graph coverage nodes;
- high evidence weight;
- completion and cooldown owned by the stage-assessment service;
- planner may suggest a checkpoint, but direct formal card publication through
  daily plan publish remains blocked.

Implementation implication:

- stage-checkpoint plan items are suggestions until Owner activates an
  assessment cycle;
- daily cards must not silently become formal checkpoints;
- formal results can shift Profile V2 more strongly, but remain auditable and
  correctable.

## Durable State Map

| State | Owner question | Owning boundary |
| --- | --- | --- |
| Target provision | Is this learner/domain/subject allowed for generation? | `learning-target-provisioning-service`, `domain-pack-provisions.js`. |
| Knowledge graph | What capability nodes and prerequisites exist? | `learning-graph-import-service`, `graph-repository.js`. |
| Planner context | What bounded state should enter the planner? | `learning-planner-context-service`. |
| Plan draft | What did Gateway suggest and what passed validation? | `learning-plan-publisher-service`, `learning-plan-drafts.js`. |
| Publish attempt | Did explicit publication succeed, fail, or get policy-blocked? | `learning-plan-publisher-service`, plan-draft latest publish attempt metadata. |
| Task card and binding | Which learner-facing card was published for which graph target? | `learning-card-generation-service`, `card-authoring-publisher.js`. |
| Submission/reflection/audio | What current evidence did the learner provide? | Growth evidence write routes and SQLite evidence/audio repositories. |
| Evaluation | How was the current card graded once? | `growth-evaluation-service`, evaluation jobs/repositories. |
| Evidence ledger | What summary evidence should profile use? | `learning-evidence-ledger-service`, `evidence-ledger.js`. |
| Profile V2 | What does Growth currently believe about the learner? | `learning-profile-v2-service`. |
| Profile delta | What changed after this cycle and why? | `learning-profile-delta-service`, `profile-delta-audits.js`. |
| Profile feedback evidence | Did the completed cycle produce enough persisted, summary-only readback to drive the next plan? | `learning-profile-feedback-evidence-service`, `scripts/smoke-growth-profile-feedback.js`. |
| Owner correction | What did Owner confirm or correct? | `learning-owner-correction-service`, evidence ledger correction rows. |
| Cycle audit | Can this card/evaluation/plan cycle explain itself? | `learning-cycle-audit-service`. |
| Cycle history | Which previous cycle should Owner inspect next? | `learning-cycle-history-service`, `scripts/smoke-growth-cycle-history.js`. |
| Audit completeness | Is the previous cycle safe to use as automation input? | `learning-audit-completeness-service`. |
| Automation proposal | What next action is proposed from an auditable source cycle? | `learning-automation-proposal-service`, `automation-proposals.js`. |
| Scheduler dry-run | What would publish if scheduling were allowed? | `learning-automation-scheduler-service`. |
| Automation digest | What dry-run packet did Owner review? | `learning-automation-digest-service`, `automation-digests.js`. |
| Automation failure policy | What visible failure, rollback, and manual retry policy is active for future scheduling design? | `learning-automation-failure-policy-service`, `automation-failure-policies.js`. |
| Automation action handoff | Which reviewed digest actions or blocked candidates were handed off for Owner attention? | `learning-automation-action-handoff-service`, `automation-action-handoffs.js`. |
| Automation scheduler execution | Which Owner-explicit execution attempts were blocked, failed, skipped, or published after all gates were rechecked? | `learning-automation-scheduler-execution-service`, `automation-scheduler-executions.js`. |
| Automation scheduler run | Which supervised scheduler tick inspected delivered handoffs and delegated actions to execution? | `learning-automation-scheduler-run-service`, `automation-scheduler-runs.js`. |
| Automation scheduler worker target | Which learner/domain/horizon target is reviewed and enabled for any future worker? | `learning-automation-scheduler-worker-target-service`, `automation-scheduler-worker-targets.js`. |
| Automation scheduler worker lease | Which local worker claimed or skipped a reviewed target without overlapping another worker? | `learning-automation-scheduler-worker-service`, `automation-scheduler-worker-leases.js`. |
| Automation release readiness | Which product, platform, visual, dry-run, config, worker-target, and release evidence is present before any production scheduling decision? | `learning-automation-release-readiness-service`, `automation-release-readiness.js`. |

## Delivery Packages

Each package must include service/DTO ownership, harness coverage, documentation
updates, and release evidence. A code-only slice is not complete.

### P1: Owner-Supervised Daily Browser Loop

Goal: Owner can create one Fanfan science or English daily card from the Growth
`生成` tab without Codex.

Required behavior:

- select visible target, learner id, domain pack, domain, subject, horizon,
  and time budget;
- render target provisioning, graph options, Profile V2, evidence audit,
  planner readiness, authoring readiness, evaluation readiness, and recent
  Owner audit summaries;
- render compact `growth.learningLoopState.v1` status and next action from
  `GET /api/v1/growth/learning-loop/state` instead of recomputing loop state
  in browser code;
- verify the same backend context through
  `npm run smoke:daily-loop-preview` as a no-write service-graph check before
  product or production review;
- verify compact state through
  `npm run smoke:learning-loop-state` as a no-write service-graph check before
  product or production review;
- verify controlled backend draft/publish through
  `npm run smoke:daily-loop -- --operation draft --allow-write ...` and
  `npm run smoke:daily-loop -- --operation publish --allow-write --plan-draft-id <id> ...`
  only in an explicitly writable local or approved production smoke context;
- create a plan draft through `POST /api/v1/growth/daily-loop/draft`;
- preview one validated plan item with target nodes, role, difficulty,
  support level, evidence requirements, minutes, rationale, and basis evidence
  ids;
- explicitly publish one selected daily item through
  `POST /api/v1/growth/daily-loop/publish`;
- show progress and bounded failures for context load, draft, publish, card
  open, and audit refresh;
- keep mobile scroll, dark-mode contrast, and embedded sizing valid.

Required harness:

- `tests/learning-daily-loop-service.test.js`;
- `tests/learning-loop-state-service.test.js`;
- `tests/growth-daily-loop-preview-smoke-script.test.js`;
- `tests/growth-learning-loop-state-smoke-script.test.js`;
- `tests/learning-profile-feedback-evidence-service.test.js`;
- `tests/growth-profile-feedback-smoke-script.test.js`;
- `tests/growth-daily-loop-smoke-script.test.js`;
- `tests/learning-card-generation-context-service.test.js`;
- `tests/learning-plan-publisher-service.test.js`;
- `tests/learning-target-provisioning-service.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-frontend-adapter.test.js`;
- `tests/growth-embedded-layout.test.js`;
- `npm run smoke:daily-loop-preview -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:learning-loop-state -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:profile-feedback -- --workspace-id <workspace> --task-card-id <taskCardId> --evaluation-id <evaluationId> --json`;
- `npm run smoke:daily-loop -- --operation draft --allow-write --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- `npm run smoke:daily-loop -- --operation publish --allow-write --plan-draft-id <planDraftId> --item-id <itemId> --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`;
- central Home AI embedded-plugin visual harness before production release.

### P2: Owner Audit And Correction UI

Goal: Owner can explain and correct the completed card cycle.

Required behavior:

- render plan reason, evidence basis, publish attempt state, generated card
  link, evaluation summary, evidence ledger ids, Profile V2, profile delta,
  stale-evidence changes, correction history, and next recommendation;
- render older-cycle history by selecting from
  `learning-cycle-history-service` rows, then drilling into audit and
  completeness through returned selectors;
- add bounded Owner corrections through
  `learning-owner-correction-service`;
- show audit completeness status for later proposal/scheduling input;
- never expose raw learner answers, transcripts, prompts, raw model output,
  source bodies, private paths, credentials, or provider configuration.

Required harness:

- `tests/learning-cycle-audit-service.test.js`;
- `tests/learning-cycle-history-service.test.js`;
- `tests/learning-audit-completeness-service.test.js`;
- `tests/learning-profile-delta-audit-service.test.js`;
- `tests/learning-evidence-audit-service.test.js`;
- `tests/learning-plan-audit-service.test.js`;
- `tests/learning-owner-correction-service.test.js`;
- `tests/learning-profile-feedback-evidence-service.test.js`;
- `tests/growth-cycle-history-smoke-script.test.js`;
- `tests/growth-owner-audit-smoke-script.test.js`;
- `npm run smoke:cycle-history` for selectable historical-cycle readback;
- `npm run smoke:owner-audit` for local or production service-graph evidence;
- `npm run smoke:profile-feedback` for completed-cycle profile/evidence
  feedback readback;
- `tests/growth-routes.test.js`;
- UI privacy tests and central visual evidence.

### P3: Stage Checkpoint Loop

Goal: formal assessments update profile confidence without becoming daily
pressure.

Required behavior:

- planner may suggest stage checkpoints;
- Owner sees readiness, coverage nodes, cooldown, and activation controls;
- activation happens only through `learning-stage-assessment-service`;
- direct formal publication from daily plan publish remains blocked.

Required harness:

- `tests/learning-stage-assessment-service.test.js`;
- planner validation/publisher blocking tests;
- `tests/growth-routes.test.js`;
- central visual harness for assessment controls.

### P4: Multi-Workspace And Domain-Pack Generalization

Goal: the same loop works for any visible and provisioned learner/domain.

Required behavior:

- Owner can select authorized targets;
- non-sample learners are blocked until explicit provisions exist;
- target learner workspace owns plan, card, evidence, profile, and audit rows;
- actor workspace remains only the actor context;
- graph nodes must belong to the selected provisioned graph context.

Required harness:

- cross-workspace allow/deny route tests;
- target-switch UI tests;
- no-data-mixing architecture guard;
- non-sample provisioned vertical in
  `tests/learning-card-ai-loop-harness.test.js`.

### P5: Supervised Automation Proposal Review

Goal: Growth can reduce repetition by proposing a next action while keeping
Owner publication explicit.

Required behavior:

- proposal requires a completed source cycle id;
- audit completeness and target provisioning pass before any new plan draft;
- proposal stores summary-only source ids, plan draft id, selected item,
  target nodes, rationale, and policy;
- Owner can accept, skip, expire, or supersede;
- accepted proposal publication delegates only to
  `learning-plan-publisher-service.publishPlanItem`;
- execution metadata remains visible and idempotent after success.

Required harness:

- `tests/learning-automation-proposal-repository.test.js`;
- `tests/learning-automation-proposal-service.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-architecture-boundary.test.js`;
- UI proposal review tests before product rollout.

### P6: Automation Digest, Rollback, And Failure Policy

Goal: scheduling candidates are proven and reviewable before any writeful
automation exists.

Required behavior:

- scheduler dry-run remains read-only and non-writeful;
- `npm run smoke:scheduler-dry-run` delegates to
  `learning-automation-scheduler-service.dryRun` through the normal service
  graph and provides no-write local or production dry-run evidence;
- automation digest persists summary-only dry-run packets and Owner review
  metadata;
- rollback/failure policy defines what happens for partial publish attempts,
  proposal execution failures, notification handoff failures, and retry
  eligibility;
- digest review does not publish, enqueue, notify, or authorize automatic
  execution by itself;
- failures are visible and bounded for Owner retry or review.

Required harness:

- `tests/learning-automation-scheduler-service.test.js`;
- `tests/growth-scheduler-dry-run-smoke-script.test.js`;
- `tests/learning-automation-digest-repository.test.js`;
- `tests/learning-automation-digest-service.test.js`;
- `tests/learning-automation-failure-policy-repository.test.js`;
- `tests/learning-automation-failure-policy-service.test.js`;
- route tests in `tests/growth-routes.test.js`;
- architecture guard for no Gateway, publication, card generation, proposal
  execution writes, notification, Action Inbox, stage activation, or direct
  table access from scheduler/digest/failure-policy services.

### P7: Notification And Action Inbox Handoff

Goal: Owner can be notified of proposed or blocked actions through Home AI
platform surfaces without moving learning policy into Home AI.

Required behavior:

- Growth emits bounded action metadata only after digest/failure policy gates;
- Home AI owns Action Inbox/Web Push delivery, permissions, and platform
  channel state;
- Growth does not expose raw learner content or model payloads in action
  notifications;
- failed notification delivery does not publish cards or mutate learner state.

Required harness:

- `tests/learning-automation-action-handoff-repository.test.js`;
- `tests/learning-automation-action-handoff-service.test.js`;
- `tests/growth-event-service.test.js`;
- route tests in `tests/growth-routes.test.js`;
- architecture guard in `tests/growth-architecture-boundary.test.js`;
- Home AI Action Inbox/Web Push contract tests in the platform workspace;
- failure tests for dropped or rejected notifications.

### P8: Owner-Explicit Scheduler Execution

Goal: controlled execution can perform one allowed action only after all
previous review, rollback, handoff, and dry-run gates are rechecked. This is
not a background scheduler and not production auto-scheduling enablement.

Implemented backend behavior:

- `learning-automation-scheduler-execution-service` supports only
  `owner_explicit_once`;
- `learning_growth_automation_scheduler_executions` stores summary-only
  `started`, `published`, `failed`, `blocked`, or `skipped` execution audit
  rows;
- `GET /api/v1/growth/automation/scheduler/executions` lists bounded
  execution DTOs after visible-target scope;
- Owner-only `POST /api/v1/growth/automation/scheduler/execute-once` delegates
  to the execution service;
- `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED` defaults to false, and the
  disabled path records a blocked execution without publishing.

Required behavior before production enablement:

- execution consumes reviewed policy/digest/action records;
- every write path rechecks target visibility, target provisioning, source
  cycle completeness through dry-run, proposal status, delivered handoff,
  reviewed digest, and active failure policy at execution time;
- writeful publish delegates only to the existing accepted-proposal publish
  service boundary;
- no direct Gateway, direct card-generation repository writes, or direct
  stage-assessment activation from execution code;
- every execution writes bounded success/failure metadata and remains
  Owner-auditable.
- no background worker or automatic publication is enabled until UI, platform
  action evidence, visual evidence, production dry-run evidence, and explicit
  release config exist.

Required harness:

- `tests/learning-automation-scheduler-execution-repository.test.js`;
- `tests/learning-automation-scheduler-execution-service.test.js`;
- scheduler dry-run service tests;
- route tests in `tests/growth-routes.test.js`;
- disabled-config, failed-publish, idempotency, and privacy tests;
- action handoff/digest/failure-policy gate tests;
- architecture guard;
- production dry-run evidence before enabling writeful mode.

### P9: Background Scheduler Contract

Goal: define the supervised scheduler tick, local worker/lease mechanics, and
any later unattended production worker without letting automation bypass Owner
audit or existing execution gates.

Implemented backend behavior:

- `learning-automation-scheduler-run-service` supports only
  `background_supervised_tick` for the initial controlled tick;
- `learning_growth_automation_scheduler_runs` stores summary-only
  `started`, `completed`, `partial`, `failed`, `blocked`, or `skipped` run
  audit rows;
- `GET /api/v1/growth/automation/scheduler/runs` lists bounded run DTOs after
  visible-target scope;
- Owner-only `POST /api/v1/growth/automation/scheduler/run-once` delegates to
  the scheduler run service;
- `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED` defaults to false, and the
  disabled path records a blocked run without listing handoffs or executing
  actions;
- focused repository, service, route, and architecture harnesses cover
  disabled config, invalid mode, stable run id/final-state updates, no
  delivered actions, delegation to execution, partial downstream execution,
  domain/horizon list filters, privacy rejection, and migration.
- `learning-automation-scheduler-worker-service` is implemented as a
  default-disabled local timer/lease boundary;
- `learning_growth_automation_scheduler_worker_leases` stores summary-only
  lease claim/release state for configured worker targets;
- `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED` defaults to false, so the HTTP
  server does not start the worker timer unless explicitly configured;
- the worker calls only
  `learning-automation-scheduler-run-service.runOnce`; if
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED` remains false, the run
  service records a blocked run and no delivered handoffs are listed.
- `learning-automation-scheduler-worker-target-service` and
  `learning_growth_automation_scheduler_worker_targets` provide the reviewed
  target configuration layer for future workers;
- worker target routes support visible-target listing, Owner-only creation of
  `proposed` summary-only targets after provisioning passes, and Owner-only
  review to `enabled`, `disabled`, or `archived`;
- the worker prefers reviewed enabled persistent targets before the local
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON` fallback.

Required behavior before production enablement:

- scheduler ticks inspect only delivered action handoffs that already passed
  digest review and active failure-policy gates;
- each candidate delegates only to
  `learning-automation-scheduler-execution-service.executeOnce`;
- the execution service still rechecks delivered handoff, reviewed digest,
  active policy, matching dry-run candidate, accepted proposal, Owner/writeful
  config, and visible target before publishing;
- no direct Gateway, direct plan publication, direct card generation, direct
  stage-assessment activation, Action Inbox calls, queues, or raw SQLite table
  access from scheduler run code;
- unattended production background scheduling remains a separate release stage
  after UI, platform action evidence, visual evidence, production dry-run
  evidence, reviewed enabled worker targets, and explicit config are complete.

Required harness:

- `tests/learning-automation-scheduler-run-repository.test.js`;
- `tests/learning-automation-scheduler-run-service.test.js`;
- `tests/learning-automation-scheduler-worker-lease-repository.test.js`;
- `tests/learning-automation-scheduler-worker-target-repository.test.js`;
- `tests/learning-automation-scheduler-worker-service.test.js`;
- `tests/learning-automation-scheduler-worker-target-service.test.js`;
- route tests in `tests/growth-routes.test.js`;
- disabled-config, invalid-mode, no-delivered-actions, partial-execution,
  idempotency, reviewed-target create/review/list, lease/race, and privacy
  tests;
- architecture guard;
- docs-locality checks;
- production dry-run and central visual evidence before any production worker.

### P10: Release-Readiness Evidence Snapshot

Goal: make production-readiness evidence explicit without enabling execution,
scheduler ticks, or unattended workers.

Implemented backend shape:

- `learning-automation-release-readiness-service` evaluates the release review
  checklist from summary-only service DTOs, config flags, scheduler dry-run
  evidence, external evidence keys, and persisted release approval records; it
  also derives a summary-only remediation plan in `releaseReview` with
  `missingCheckKeys`, `blockedCheckKeys`, `missingEvidenceKeys`,
  `requiredActionCount`, `requiredActions`, and `nextAction`;
- `learning-automation-release-approval-service` records and lists
  summary-only approvals for individual writeful config gates and projects
  active approvals back into release-readiness input;
- `learning-automation-platform-action-evidence-service` reads only Growth
  event-outbox delivered `growth.automation.action_required` receipts and
  emits summary-only `growth.learningAutomationPlatformActionEvidence.v1`
  release evidence; Home AI still owns Action Inbox and Web Push internals;
- `automation-release-approvals.js` persists summary-only approval records in
  `learning_growth_automation_release_approvals`;
- `automation-release-readiness.js` persists summary-only snapshots in
  `learning_growth_automation_release_readiness`;
- visible-target scoped `GET /api/v1/growth/automation/release-readiness`
  returns an advisory readiness DTO;
- visible-target scoped
  `GET /api/v1/growth/automation/release-readiness/snapshots` lists public
  snapshot DTOs;
- Owner-only
  `POST /api/v1/growth/automation/release-readiness/snapshots` creates
  summary-only review snapshots;
- visible-target scoped
  `GET /api/v1/growth/automation/release-approvals` lists public approval
  DTOs;
- Owner-only
  `POST /api/v1/growth/automation/release-approvals` records one summary-only
  approval for a canonical writeful config gate;
- `npm run smoke:release-readiness` evaluates the same service from the CLI.
  It is no-write by default and creates a snapshot only when
  `--write-snapshot` is supplied.
- `npm run smoke:release-evidence-bundle` delegates to
  `learning-automation-release-evidence-bundle-service` and builds a
  summary-only `growth.learningAutomationReleaseEvidenceBundle.v1` artifact
  from selected no-write/default-disabled smoke CLIs, including read-only
  cycle-history readback, read-only Owner audit readback, read-only
  learner-cycle audit, stage-assessment readiness, proposal smoke, platform
  action evidence, and read-only release approval bag projection in the
  default task set. It maps
  `npm run smoke:release-approval -- --operation bag` into the bundle
  `releaseApproval` field so persisted approvals can flow into
  release-readiness without hand-spliced JSON. Use `--target-node-id` when
  collecting stage-checkpoint evidence. The default `owner_audit` task maps
  no-write `npm run smoke:owner-audit` output to
  `productionOwnerAuditSmokeEvidence`. The default `learner_cycle` task
  allows only no-write `audit` and maps to
  `productionLearnerCycleSmokeEvidence`; use direct
  `npm run smoke:learner-cycle` for any Owner-requested write operation
  because learner submissions/reflections must not pass through the bundle.
  The default `platform_action` task maps
  `npm run smoke:platform-action-evidence` output to `platformActionEvidence`
  from delivered Growth outbox receipts without reading Home AI internal
  Action Inbox/Web Push storage.
  Use `--task daily_loop_write
  --allow-write-evidence --daily-loop-write-operation draft|publish` only when
  intentionally collecting controlled production daily-loop write evidence;
  the task is outside the default bundle, fails closed without that explicit
  flag, requires `--plan-draft-id` for publish, and delegates through
  `scripts/smoke-growth-daily-loop.js` rather than importing daily-loop
  services. Use `--output-file` and then pass that file to
  `npm run smoke:release-readiness -- --evidence-bundle-file <path>` when
  release review needs structured smoke evidence without Codex hand-spliced
  JSON.
- `npm run smoke:release-approval` delegates to the approval service. It
  defaults to read-only list, supports read-only approval bag projection, and
  requires explicit `--allow-write` for `record`.

Required behavior:

- aggregate summary-only evidence for Owner daily UI, audit/correction UI,
  stage-checkpoint separation from `npm run smoke:stage-assessment`, proposal
  review, production proposal smoke evidence from `npm run smoke:proposal`,
  automation digest UI, digest review, active failure policy, delivered action
  handoff, automation action handoff UI, production action handoff smoke evidence from
  `npm run smoke:action-handoff`, Owner-explicit execution gate status,
  scheduler execution UI, production scheduler execution smoke evidence from
  `npm run smoke:scheduler-execution`, scheduler run default-disabled status,
  scheduler run UI, production scheduler run smoke evidence from
  `npm run smoke:scheduler-run`, scheduler worker-target UI, production
  scheduler worker target smoke evidence from
  `npm run smoke:scheduler-worker-target`, reviewed enabled worker targets,
  worker lease/timer default-disabled status, production scheduler worker smoke
  evidence from
  `npm run smoke:scheduler-worker`, production planner readiness
  smoke evidence from `npm run smoke:planner-readiness`, production
  daily-loop preview smoke evidence from
  `npm run smoke:daily-loop-preview`, production learning-loop state smoke
  evidence from `npm run smoke:learning-loop-state`, production cycle-history
  smoke evidence from `npm run smoke:cycle-history` or the default
  `cycle_history` release-bundle task, production Owner audit smoke evidence
  from `npm run smoke:owner-audit` or the default `owner_audit`
  release-bundle task, production controlled daily-loop
  draft/publish smoke evidence from
  `npm run smoke:daily-loop -- --operation draft|publish --allow-write ...`
  or the explicit write-gated `daily_loop_write` release-bundle task,
  production learner-cycle audit smoke evidence from
  `npm run smoke:learner-cycle` or the default `learner_cycle`
  release-bundle task,
  production scheduler dry-run smoke evidence from
  `npm run smoke:scheduler-dry-run`, release-readiness internal
  no-write scheduler dry-run safety evidence, platform Action Inbox/Web Push
  receipt evidence from `npm run smoke:platform-action-evidence` or the
  default `platform_action` release-bundle task,
  central embedded visual evidence, and explicit release approval records for
  each writeful config gate;
- return bounded check statuses such as `pass`, `missing`, `blocked`, or
  `not_applicable`;
- return a bounded `releaseReview` remediation plan derived from non-passing
  checks so Owner/release tooling can see the next required action without
  traversing raw check details;
- persist optional Owner-created summary-only snapshots for audit review;
- support structured production evidence collection without Codex by accepting
  only bounded evidence JSON, release-approval JSON, versioned
  `growth.learningAutomationReleaseEvidenceBundle.v1` evidence bundles through
  `--evidence-bundle-file` / `--evidence-bundle-json`, and summary evidence
  flags through the CLI;
- keep `writefulSchedulingAllowed=false` and never flip runtime config;
- never call Gateway, Owner audit services directly, publish plans, generate
  cards, evaluate submissions, record proposal execution, run scheduler
  execution, start scheduler ticks, deliver notifications, activate stage
  assessments, or mutate learner state.

Required harness:

- `tests/learning-automation-release-readiness-repository.test.js`;
- `tests/learning-automation-release-approval-repository.test.js`;
- `tests/learning-automation-release-approval-service.test.js`;
- `tests/learning-automation-platform-action-evidence-service.test.js`;
- `tests/learning-automation-release-readiness-service.test.js`;
- `tests/growth-platform-action-evidence-smoke-script.test.js`;
- `tests/growth-automation-release-approval-smoke-script.test.js`;
- `tests/growth-release-readiness-smoke-script.test.js`;
- `tests/learning-automation-release-evidence-bundle-service.test.js`;
- `tests/growth-release-evidence-bundle-script.test.js`;
- route tests in `tests/growth-routes.test.js`;
- architecture guard in `tests/growth-architecture-boundary.test.js`,
  including the `releaseReview` remediation fields;
- smoke syntax and package-script checks through `npm run check`;
- docs-locality checks and broad local validation.

Remaining release gaps:

- product UI evidence for Owner daily, audit/correction, proposal review,
  digest/action/execution/run, and worker-target views;
- real production Home AI platform Action Inbox/Web Push receipt evidence from
  `npm run smoke:platform-action-evidence`;
- central embedded-plugin visual evidence for mobile scroll, dark mode,
  progress, and embedded shell;
- production planner readiness smoke from `npm run smoke:planner-readiness`,
  production learning-loop state smoke from `npm run smoke:learning-loop-state`,
  production cycle-history smoke from `npm run smoke:cycle-history` or the
  default `cycle_history` release-bundle task,
  production Owner audit smoke from `npm run smoke:owner-audit` or the default
  `owner_audit` release-bundle task,
  production controlled daily-loop draft/publish smoke from
  `npm run smoke:daily-loop` or the explicit `daily_loop_write`
  release-bundle task, production learner-cycle audit smoke from
  `npm run smoke:learner-cycle` or the default `learner_cycle`
  release-bundle task, and production scheduler dry-run smoke from
  `npm run smoke:scheduler-dry-run`;
- Owner-visible product UI evidence for recording/reviewing release approvals
  outside the smoke CLI.

## Immediate Execution Guidance

The next implementation slice should be chosen by product goal:

- If the goal is product-visible learning for Fanfan, implement P1 first:
  complete the Owner daily browser loop over the existing daily-loop facade,
  with `npm run smoke:daily-loop-preview` as the no-write backend readiness
  evidence before visual or production review.
- If the goal is backend automation safety before more UI, the service-level
  P5-P6 completed-cycle path is now covered by
  `tests/learning-card-ai-loop-harness.test.js`: a completed Fanfan science
  cycle can produce a summary-only accepted proposal, a read-only scheduler
  `would_publish` candidate, and a pending digest required action without
  automatic publication. Proposal operational smoke is also available through
  `npm run smoke:proposal`, which defaults to read-only list and gates
  create/review/publish with explicit `--allow-write`. Implement the remaining
  UI/evidence around P5-P10 next: proposal review UI, digest/action/
  failure-policy UI, execution UI, scheduler run audit UI, platform Action
  Inbox/Web Push evidence, production dry-run evidence through
  `npm run smoke:scheduler-dry-run`, central visual evidence, and a
  release-readiness evidence snapshot. The P8 and P9 backend boundaries are
  implemented locally and remain default-disabled; the P10 backend boundary is
  an evidence gate only and must not enable execution or scheduling.

Do not start background writeful scheduling or automatic card publication until
P1, P2, P5, P6, P7, P8, P9 UI/evidence, P10 release-readiness evidence, and
the required platform/visual/harness evidence are complete.

## Definition Of Done

An implementation package is done only when all of these are true:

- the owning Growth-local document is updated;
- service, repository, route, UI, architecture, privacy, and visual harnesses
  are updated according to the touched boundary;
- `node scripts/check-growth-docs-locality.js` passes;
- `node --test tests/growth-docs-locality.test.js` passes;
- focused tests for the touched boundary pass;
- broad local validation passes before commit/deploy;
- UI release has central Home AI embedded-plugin visual evidence;
- `.agent-context/HANDOFF.md` records the changed state and remaining gaps.
