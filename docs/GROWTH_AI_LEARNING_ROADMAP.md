# Growth AI Learning Roadmap

Last updated: 2026-06-15.

## Purpose

This document is the execution roadmap for turning Growth into a supervised,
AI-driven learning system. It complements:

- `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`, the durable system scheme and
  product thesis;
- `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`, the closed-loop product
  contract;
- `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`, the implementation
  package plan and definition of done;
- `docs/GROWTH_LEARNING_OPERATING_LOOP.md`, the product and architecture
  target;
- `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`, the implementation
  blueprint;
- `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`, the current next-stage
  execution selector and release-readiness semantics;
- `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`, the supervised digest
  gate before writeful scheduling;
- `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`, the
  default-disabled background scheduler contract;
- `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`, the Owner UI contract.

The roadmap starts with Fanfan as the sample learner, but every backend rule
must generalize to any authorized learner workspace, domain pack, subject, and
knowledge graph.

## North Star

Growth should repeatedly answer one operational question:

> Given this learner's current profile, evidence history, graph position,
> pressure signals, and Owner constraints, what is the next low-pressure
> learning action that should be offered, and how will the result update the
> profile?

The answer must be:

- AI-assisted, but only through Gateway;
- validated before durable writes;
- visible and auditable by Owner;
- low-pressure for daily learning;
- scientifically conservative about mastery claims;
- cumulative over weeks and months.

## Planning Rule

Roadmap progress must be reported by learning-loop capability, not by the
number of generated cards or the number of automation backends implemented.

The required order is:

1. make one daily learning loop browser-operable for Fanfan;
2. make the resulting profile/audit/correction loop browser-operable;
3. keep formal checkpoints separate and auditable;
4. generalize to other visible and provisioned learner/domain targets;
5. add supervised proposals and review surfaces;
6. add digest, action handoff, execution, scheduler run, worker target, and
   release-readiness evidence;
7. consider writeful scheduling only after product UI, central visual,
   platform action, production dry-run, reviewed-target, config approval, and
   Harness evidence exist.

This order is part of the product safety model. Automation that cannot be
explained from the Owner audit loop is not ready, even if backend services can
produce proposals or dry-run candidates.

## Time-Scale Roadmap

Growth must mature across three learning time scales. Each time scale has a
different product promise and evidence weight, so roadmap items should not
collapse them into one generic "card generation" bucket.

| Time scale | First target | Product promise | Release gate |
| --- | --- | --- | --- |
| Daily loop | Fanfan English/science daily practice. | Small low-pressure card, one evaluation, optional reflection, score becomes evidence for the next plan. | Owner and learner can complete the loop from the embedded plugin with visible progress/error states and audit refresh. |
| Stage checkpoint loop | Formal checkpoint after enough recent evidence and cooldown. | Stronger profile update over explicit coverage without making daily work high-stakes. | Owner can see readiness/coverage/cooldown and activate only through stage-assessment service controls. |
| Program evolution loop | Multi-week progression across a graph region or subject. | Repeated daily evidence plus occasional checkpoints shift Profile V2 and next recommendations over time. | Owner can review profile trends, stale evidence, repeated weaknesses, corrections, and release evidence before any broader automation. |

The daily loop is the first product release target because it creates the
evidence that makes later checkpoint and automation decisions meaningful. A
formal checkpoint without enough daily evidence is weak science; automation
without a visible audit loop is weak governance.

## Capability Model

Growth is not only a card generator. The product capability is the complete
closed loop from a learning target to the next learning target.

The minimum complete loop for any learner/domain is:

1. Owner selects a learner, domain pack, subject, horizon, and time budget.
2. Growth verifies visibility and target provisioning.
3. Growth projects graph options, Profile V2, evidence audit, stage readiness,
   and Gateway readiness.
4. Gateway drafts a plan from summary-only state.
5. Growth validates and stores the plan as an Owner-auditable draft.
6. Owner publishes one selected item, or activates a formal stage assessment
   through the assessment service.
7. Gateway authors the card from the validated plan or graph plan.
8. The learner completes the card.
9. Gateway evaluates current evidence once.
10. Growth writes evaluation, reward, evidence ledger, profile, trajectory,
    recommendation lifecycle, and profile-delta audit.
11. Owner can inspect the audit and add bounded correction evidence.
12. The next planner run uses persisted state, not transient prompt text.

Product capability should be measured across these axes:

| Axis | Rule | Current target |
| --- | --- | --- |
| Learner scope | Fanfan is the sample, but learner workspace and learner id are parameters. | Non-sample learners require view-target visibility plus explicit provision. |
| Knowledge scope | Domain pack, domain, subject, and graph nodes are first-class selectors. | UK/HK curriculum graph supports English and science verticals first. |
| Profile scope | Profile is a read projection from evidence, not a browser-side mutable object. | Profile V2 summarizes capability state, confidence, freshness, pressure, misconceptions, and planner hints. |
| Planning scope | AI selects objectives only through Gateway and validated draft schema. | Daily, repair, weekly, and stage-checkpoint horizons are planned as drafts. |
| Card scope | Daily practice and formal assessments are separate product modes. | Daily cards use `daily_score_once`; formal cards use stage-assessment activation. |
| Audit scope | Owner can see why a card was selected and what changed after completion. | Plan drafts, evidence ledger rows, profile-delta audits, corrections, and recommendation lifecycle are persisted. |
| Automation scope | Automation must be supervised before it becomes scheduled. | Owner-reviewed proposals come before scheduler dry-run; digest review comes before notification, automatic publish, or background scheduling. |

## Scientific Learning Policy

Growth should be conservative about what evidence proves. The system should
accumulate small observations without turning daily practice into a pressure
loop.

Evidence interpretation rules:

- One daily answer can support an emerging observation, but it should not by
  itself create a stable mastery claim.
- Formal stage-assessment evidence has higher weight only because coverage,
  activation, and cooldown are explicit.
- Learner experience signals such as `too_hard`, `not_learned`, fatigue, or
  frustration are pressure and planning evidence, not mastery proof.
- Owner corrections are additive audit evidence. They can adjust Profile V2
  state, but they do not erase prior evidence or refresh learner-evidence
  recency.
- Unobserved graph nodes are unknown, not weak.
- Stale strengths should become low-pressure review hints, not stretch claims.

Planning rules:

- Weak prerequisite evidence should usually lead to repair or review before a
  stretch card.
- New graph nodes may be introduced only when prerequisite evidence and
  pressure signals make the step plausible for the selected time budget.
- Daily low scores should influence the next plan, not block completion or
  force repeated resubmission.
- Weekly plans must stay short and must not create backlog debt for missed
  daily work.
- Stage checkpoints should appear only when readiness, freshness, coverage,
  and cooldown policy justify a formal event.

## Owner Operating Modes

Growth should expose four Owner modes over the same service records.

| Mode | Owner question | Required system behavior |
| --- | --- | --- |
| Generate | What should this learner do next today? | Show target scope, readiness, plan draft, publish action, progress, and visible failure state. |
| Audit | Why did this card happen and what changed? | Show plan reason, evidence basis, profile delta, stale-evidence changes, correction history, and next recommendation. |
| Assess | Is this learner ready for a formal checkpoint? | Show coverage, readiness, cooldown, and activation controls owned by `learning-stage-assessment-service`. |
| Review | Is Growth's profile judgment right? | Let Owner add bounded correction or confirmation evidence without editing raw history. |

The first product path is Fanfan science or English daily practice. A complete
browser path means Owner can select the target, draft a plan, publish one
validated daily item, let the learner complete it, and then inspect the audit
without using Codex or a database console.

Plan publication failure is part of the audit loop. A failed authoring call,
privacy block, provisioning block, or stage-assessment direct-publish block
must leave the plan draft unpublished while recording a bounded latest
publish-attempt status/error/stage for Owner audit.

## Owner Workflow Playbook

This section is the product-level operating guide for the first complete
browser workflow. It should stay aligned with
`docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` and the route contracts in
`docs/HOME_AI_PLATFORM_CONTRACT.md`.

### Create One Fanfan Science Daily Card

Actor and target:

- actor: Owner;
- target learner workspace: Fanfan's Growth target returned by
  `GET /api/v1/growth/view-targets`;
- learner id: `fanfan`;
- domain pack: UK/HK curriculum foundation;
- domain and subject: `science`;
- horizon: `daily_plan`;
- available time: `15` minutes.

Prerequisites:

- Growth view-target visibility includes the Fanfan target;
- the UK/HK curriculum graph has been imported into native Growth graph
  tables;
- target provisioning is active through the sample fallback or an explicit
  provision;
- planner, authoring, and evaluation Gateway boundaries are configured for a
  production model-backed loop, or the UI clearly shows which boundary is
  using a local/fake harness path;
- `npm run smoke:planner-readiness` succeeds before production UI rollout.

Browser workflow:

1. Owner opens the Growth plugin and selects the `生成` tab.
2. The UI loads `GET /api/v1/growth/card-generation/context` for the selected
   target with `domainPackId`, `domain=science`, `subject=science`,
   `horizon=daily_plan`, and `availableMinutes=15`.
3. The UI renders target provisioning, graph options, Profile V2, evidence
   audit, planner readiness, authoring readiness, evaluation readiness, and
   recent Owner audit summaries.
4. Owner clicks the plan action. The UI calls
   `POST /api/v1/growth/learning-plans/draft`.
5. Growth calls the planner Gateway boundary, validates
   `growth.learningPlanDraft.v1`, and stores a summary-only plan draft.
6. Owner reviews the validated item: target nodes, role, difficulty, support
   level, evidence requirements, estimated minutes, rationale, and basis
   evidence ids.
7. Owner explicitly publishes one selected daily item through
   `POST /api/v1/growth/learning-plans/:planDraftId/publish`.
8. Growth authors and validates the card through the authoring boundary, then
   writes the task card and graph binding transactionally.
9. The learner completes the generated daily card through the existing card
   detail: one submission, one evaluation, and one optional reflection.
10. Growth evaluates once, writes reward/evidence/profile/audit records, and
    refreshes the generation context so Owner can see the profile-delta audit
    and the next recommendation.

If step 7 or 8 fails, Growth does not mark the draft as published. It records
bounded `publishAttempt` metadata in `learning_growth_plan_drafts`, and the
plan-audit and cycle-audit readbacks expose that state without raw model output
or raw learner content.

The daily flow is successful even when the score is low. Low score, learner
friction, or uncertainty becomes evidence for the next plan, not a retry gate.

### What Owner Should Be Able To Audit

After the card is completed, the Owner audit surface should explain:

- why the planner selected this node now;
- which profile states, stale-evidence signals, pressure signals, or recent
  evidence summaries supported the choice;
- which model boundaries ran: planner, authoring, and evaluation;
- which durable rows were written: plan draft, generated card, graph binding,
  evaluation, evidence ledger, profile-delta audit, trajectory, and
  recommendation lifecycle;
- what Profile V2 changed, what stayed stale, and whether an Owner correction
  was added;
- what the next low-pressure recommendation is and why.

The audit is not a raw transcript viewer. It must use bounded DTOs from
service-owned read routes and must not expose raw learner answers, full audio
transcripts, raw prompts, raw model output, source-document bodies, private
paths, credentials, or provider configuration.

### Create A Supervised Next-Learning Proposal

This is the first automation shape. It is a proposal workflow, not a
background scheduler.

Actor and target:

- actor: Owner only for writes;
- target learner workspace: any Growth visible target;
- source cycle: at least one bounded id from the previous cycle, such as
  `sourcePlanDraftId`, `sourceTaskCardId`, `sourceEvaluationId`,
  `profileDeltaId`, `evidenceId`, `correctionId`, or `sourceId`;
- target scope: provisioned domain pack, domain, subject, horizon, available
  minutes, and optional target nodes.

Workflow:

1. Owner or UI selects a completed previous cycle from the cycle-audit surface.
2. Growth checks `GET /api/v1/growth/learning-cycles/completeness` for that
   source cycle.
3. Owner requests a proposal through
   `POST /api/v1/growth/automation/proposals`.
4. `learning-automation-proposal-service` rejects missing source cycles,
   privacy-risk payload fields, incomplete audit cycles, or unprovisioned
   targets before drafting a new plan.
5. If the source cycle is ready and the target is provisioned, the service
   calls the existing plan draft boundary through
   `learning-plan-publisher-service.draftPlan`.
6. Growth persists a summary-only `learning_growth_automation_proposals` row
   linking the previous cycle, new plan draft, selected item, target nodes,
   bounded rationale, and Owner policy.
7. UI shows the proposal and the explicit publish action. Owner can publish
   one selected daily card either by calling the existing plan publish route or
   by calling the proposal publish route, which delegates to the same plan
   publisher service and records proposal execution metadata.

Non-goals:

- proposal creation must not call authoring or evaluation model boundaries;
- proposal creation must not call card generation directly;
- proposal creation must not activate a formal stage assessment;
- proposal creation must not enqueue a background scheduler;
- `readyForAutomation=true` is only an input gate, not publish permission.

## Capability Readiness Levels

Use these levels to describe implementation progress precisely.

| Level | Meaning | Required evidence |
| --- | --- | --- |
| L0: Backend foundation | Services, repositories, and routes can run the loop with fake or configured Gateway clients. | Service, route, architecture, AI-boundary, docs-locality, and full local harnesses pass. |
| L1: Cycle audit aggregate | Owner and later UI can read one learning cycle through a single service-owned audit DTO. | Cycle-audit service, plan publish-attempt audit, audit-completeness readback, route, privacy, target-scope, and architecture harnesses pass. |
| L2: Owner-supervised browser loop | Owner can create one daily card from the Growth UI without Codex. | Planner UI, progress/errors, mobile scroll, dark-mode contrast, central visual harness, and planner readiness smoke pass. |
| L3: Closed audit loop | Owner can inspect plan basis, evaluation result, profile delta, corrections, and next recommendation after completion. | Audit UI tests, privacy tests, plan/evidence/profile-delta/correction/cycle readback tests, and visual evidence pass. |
| L4: Generalized target loop | Any visible and provisioned learner/domain pack can use the same flow. | Cross-workspace allow/deny tests, target-switch UI tests, non-sample provisioned vertical harness, and no-data-mixing guard pass. |
| L5: Supervised automation proposal | Growth can propose future work under explicit Owner policy, record Owner decisions, and explicitly publish accepted proposals without starting a scheduler. | Proposal service/repository/route tests, audit-completeness gating, target provisioning, accepted-only publish execution, privacy rejection, and architecture no-direct-Gateway/direct-card-generation guard pass. |
| L6: Supervised digest and scheduling readiness | Growth can persist and review dry-run packets, evaluate active failure policy, and record bounded action handoffs before any scheduler writes. | Scheduler dry-run, automation digest repository/service/route/UI tests, failure-policy repository/service/route tests, action handoff repository/service/event/route tests, and platform notification/action evidence pass before writeful scheduling. |
| L7: Owner-explicit scheduler execution | Growth can execute one delivered, reviewed, accepted proposal through an Owner action while the writeful gate remains default-disabled. | Scheduler execution repository/service/route tests, disabled-config blocked-state tests, delivered-handoff/reviewed-digest/active-policy/dry-run recheck tests, accepted-proposal publish delegation tests, and architecture no-direct-Gateway/direct-card-generation/direct-plan-publish/stage-activation guard pass. |
| L8: Background scheduler contract | Growth can record and audit one supervised scheduler tick, review persistent worker targets, and guard a default-disabled worker lease/timer boundary while background automation remains disabled by default and delegates only through scheduler run to execution. | Scheduler run repository/service/route tests, worker target repository/service/route tests, worker lease repository/service tests, disabled-config blocked-state tests, no-handoff skipped-state tests, reviewed-target preference before local env fallback, active/stale lease tests, partial execution tests, architecture no-direct-Gateway/direct-publish/direct-card-generation/stage-activation guard, production dry-run evidence, and explicit release evidence pass. |
| L9: Release-readiness evidence | Growth can summarize product, platform, visual, dry-run, reviewed-target, config, approval, and smoke-bundle evidence without enabling execution or scheduling. | Release-readiness repository/service/route tests, release evidence bundle service/script tests, `tests/growth-release-readiness-smoke-script.test.js`, `tests/growth-release-evidence-bundle-script.test.js`, privacy rejection, disabled-config evidence, missing-evidence states, architecture no-Gateway/no-publication/no-evaluation/no-scheduler/no-stage-activation guard, docs-locality checks, and broad local validation pass. |

The current backend work has passed the early operating-loop backend levels and
now includes the default-disabled L7 execution boundary and L8 supervised
scheduler-run boundary. Product readiness still requires the
Owner-supervised browser loop, audit UI, proposal/digest/action/execution/run
UI, L9 release-readiness evidence, platform action evidence, visual evidence,
and explicit production decisions before enabling `execute-once` or scheduler
ticks. Background
scheduling remains disabled and must follow
`docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`.

## Stage-Gate Map

The roadmap should be executed as evidence-producing gates, not as one large
automation switch.

| Gate | Question | Must be true before moving on |
| --- | --- | --- |
| G1: Owner daily card | Can Owner create one low-pressure card without Codex? | UI can load context, show readiness, draft or directly generate through Growth service routes, publish one daily card, show progress, and show bounded failures on mobile and dark mode. |
| G2: Owner audit | Can Owner explain the card after completion? | Cycle audit, evidence audit, profile-delta audit, corrections, next recommendation, and `npm run smoke:owner-audit` are rendered or exercised from service DTOs without raw private payloads. |
| G3: Formal checkpoint separation | Are formal checks separate from daily practice? | Stage readiness, cooldown, and coverage are visible; direct formal publication from daily plan remains blocked; activation goes only through `learning-stage-assessment-service`. |
| G4: Generalized target | Can the same loop run outside the Fanfan sample? | Visible non-sample learners remain blocked until provisioned; explicit provision enables a selected domain pack/subject; actor and target workspaces never mix. |
| G5: Proposal review | Can Growth reduce Owner repetition without hiding decisions? | A stored proposal links a completed cycle to a validated new plan item; Owner can accept, skip, expire, or supersede; accepted publication remains explicit and auditable. |
| G6: Scheduler dry-run and digest | Can scheduling be proven and reviewed before it writes? | Scheduler dry-run consumes accepted proposals or stored policy, rechecks audit completeness and provisioning, reports would-publish/blocked/skipped results, and a digest layer persists summary-only review packets without executing them. |
| G7: Owner-explicit execution | Can one reviewed action execute without opening a background scheduler? | `execute-once` requires a delivered handoff, reviewed digest, active policy, matching dry-run candidate, accepted proposal, Owner role, workspace bearer, visible target, and `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`; the execution service delegates only to accepted-proposal publish and records summary-only execution state. |
| G8: Background scheduler contract | Can one supervised scheduler tick, one reviewed worker target, and one default-disabled worker lease path be recorded without enabling production unattended scheduling? | `run-once` requires Owner role, workspace bearer, visible target, `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=true`, delivered handoff candidates, and delegation only to `execute-once`; worker targets require Owner-reviewed `enabled` rows after provisioning passes; worker timer requires `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=true`, active lease protection, and scheduler-run-service-only delegation. Local env target JSON is fallback only. Production unattended scheduling remains disabled until platform, visual, production dry-run, reviewed enabled targets, and release evidence are complete. |
| G9: Release-readiness evidence | Can Growth state exactly which release prerequisites are present or missing? | A release-readiness boundary and `npm run smoke:release-readiness` return bounded `pass`/`missing`/`blocked`/`not_applicable` checks for product UI, audit UI, proposal/digest/action/execution/run UI, active policy, delivered handoffs, reviewed targets, disabled/enabled config gates, platform Action Inbox/Web Push evidence, central visual evidence, production learning-loop state smoke, production controlled daily-loop write smoke, production dry-run evidence, and explicit release approval. It must not publish, schedule, call Gateway, evaluate, activate stage assessments, deliver notifications, or mutate learner state. |

The immediate target is G1 plus the minimum audit readback needed to avoid a
silent generation experience. G2 should follow before broader automation
because Owner needs to see profile effects before trusting future AI
suggestions.

## Product Rules

### Daily Practice

Daily cards are routine learning events, not exams.

- Expected duration: 10-15 minutes.
- Learner flow: one submission, one evaluation, one optional reflection.
- Completion: after the first evaluation, regardless of score.
- Reward: score-proportional, without a pass-line retry gate.
- Evidence weight: low or medium.
- Low score meaning: planning evidence for repair/support, not a child-facing
  failure loop.

### Stage Assessment

Stage assessments are formal checkpoints used to update profile confidence.

- Expected duration: 25-30 minutes.
- Activation: only through `learning-stage-assessment-service`.
- Coverage: explicit graph coverage nodes.
- Evidence weight: high.
- Lifecycle: activation, completion, cooldown.
- Planner role: may suggest a checkpoint, but must not silently publish one.

### Owner Supervision

Owner should be able to inspect:

- why this learner received this target now;
- what bounded evidence and profile state supported the decision;
- which model boundary was entered, if any;
- what changed after completion;
- what next action Growth recommends.

Owner corrections are additive evidence. They must not edit historical
evaluation rows, delete learner evidence, or mutate Profile V2 directly from
browser code.

## Model Boundaries

Only three Growth steps enter a model.

| Step | Service boundary | Model input | Draft output | Durable write gate |
| --- | --- | --- | --- | --- |
| Plan | `learning-plan-orchestrator-service` plus `growth-gateway-planner-client` | Profile V2 summary, stale-evidence summaries, graph candidates, recent evidence summaries, target provision, horizon, available minutes, pressure policy. | `growth.learningPlanDraft.v1`. | `learning-plan-validation-service`, then `learning-plan-publisher-service` stores the draft. |
| Author | `learning-card-authoring-service` plus `growth-gateway-authoring-client` | Validated planner item or `learningGraphPlan`, graph/history/profile summaries, role, difficulty, evidence requirements. | Versioned authoring draft with `teachingFlow`. | `learning-card-authoring-validation-service`, then `card-authoring-publisher` writes card rows and graph binding transactionally. |
| Evaluate | `learning-card-evaluation-service` plus `growth-gateway-evaluation-client` | Current authenticated submission evidence for the current card, bounded audio metadata, card policy, graph metadata. | `growth.card.evaluation.v1`. | Evaluation validation, then `growth-evaluation-service` writes evaluation and downstream state. |

Planning and authoring must not receive raw historical answers, raw
transcripts, hidden answer keys, raw prompts, raw model output, source-document
bodies, private paths, secrets, tokens, cookies, or provider configuration.
Evaluation may receive only the current answer payload needed to grade the
current card.

## Closed Loop

The target state chain is:

1. Owner selects learner, domain pack, subject, horizon, and time budget.
2. Growth verifies target visibility and learning target provisioning.
3. Growth projects graph options, evidence audit, Profile V2, stale evidence,
   stage readiness, and Gateway readiness.
4. Gateway drafts a plan.
5. Growth validates and stores the plan as an auditable draft.
6. Owner explicitly publishes one selected daily item, or uses stage
   assessment controls for a formal checkpoint.
7. Gateway authors the card from the validated plan item.
8. The learner completes one low-pressure daily flow or one formal assessment
   flow.
9. Gateway evaluates the current evidence once.
10. Growth writes evaluation, reward, evidence ledger, stage cycle updates,
    trajectory, recommendation lifecycle, Profile V2 projection, and
    profile-delta audit.
11. Owner reviews audit and may add bounded correction evidence.
12. The next planner run uses the updated profile and evidence.

The loop is complete only when the next plan can be explained from persisted
bounded records, not from transient prompt text or browser state.

## Current Capability Baseline

As of 2026-06-15, the backend foundation covers the first closed-loop
milestone:

- native knowledge-graph import, graph plans, graph bindings, and graph option
  projection;
- target/domain-pack provisioning service and repository;
- Gateway-backed card authoring and evaluation boundaries;
- `daily_score_once` generated-card flow;
- formal stage assessment activation, generated formal cards, high-weight
  evidence, completion, and cooldown;
- summary-only evidence ledger;
- bounded evidence audit readback service and visible-target scoped
  `GET /api/v1/growth/evidence/audit`;
- bounded learning-cycle audit aggregate and visible-target scoped
  `GET /api/v1/growth/learning-cycles/audit` for one card/evaluation/plan
  cycle;
- Profile V2 projection with source-specific stale-evidence freshness;
- planner context, Gateway planner client, plan validation, draft persistence,
  publish bridge, and no-write readiness smoke;
- plan audit readback service and Owner context projection for recent
  validated drafts, selected published items, generated card ids, generated
  graph plan ids, and plan evidence basis, plus a visible-target scoped
  `GET /api/v1/growth/learning-plans/audit` route;
- read-only audit-completeness checks for a source learning cycle before
  future UI closure or supervised proposal workflows;
- post-evaluation profile-delta DTO, durable profile-delta audit repository,
  and public readback route;
- Owner profile correction service, read/write routes, and service-owned
  `npm run smoke:owner-audit` for read-only audit/completeness/correction
  readback plus explicit write-gated correction evidence;
- supervised automation proposal dry-run service, repository, and route:
  source-cycle completeness plus target provisioning are required before a new
  plan draft can be stored as a proposal, and proposal creation does not
  publish cards or start scheduling;
- read-only supervised scheduler dry-run service and route:
  `learning-automation-scheduler-service` and
  `POST /api/v1/growth/automation/scheduler/dry-run` list accepted proposals,
  recheck audit completeness and target provisioning, and return
  `would_publish`, blocked, or skipped candidates without writes or
  publication;
- automation digest backend:
  `learning-automation-digest-service`,
  `learning_growth_automation_digests`, and
  `GET`/`POST /api/v1/growth/automation/digests` plus
  `POST /api/v1/growth/automation/digests/:digestId/review` persist and
  review summary-only scheduler dry-run packets while preserving
  `dryRun=true`, `writePlanned=false`, `writesPerformed=false`, and
  `publishPlanned=false`;
- automation action handoff backend:
  `learning-automation-action-handoff-service`,
  `learning_growth_automation_action_handoffs`, and
  `GET`/`POST /api/v1/growth/automation/action-handoffs` plus
  `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`
  create bounded handoff records only after reviewed digest and active
  failure-policy gates, emit `growth.automation.action_required` through the
  Growth event boundary, and record visible delivery success or failure
  without publishing or mutating learner state;
- service-level Fanfan science vertical harness through planner draft,
  publish, generated card, learner evidence, evaluation, ledger, Profile V2,
  and profile delta;
- service-level non-sample science vertical harness proving that a visible but
  unprovisioned learner is blocked before planner/authoring Gateway calls, then
  succeeds only after an explicit domain-pack/subject provision, with plan,
  card, evidence, Profile V2, and profile-delta rows remaining target-workspace
  scoped.

The product is not complete yet because the embedded Owner UI still needs the
planner preview/publish surface, provision controls, full audit/correction
readback rendering, and supervised proposal review UI. Any later scheduler
remains a future product slice. Production planner Gateway readiness smoke and
central visual evidence are also required before deploying that UI.

## Delivery Stages

### Stage 1: Owner-Supervised Daily Planning UI

Goal: Owner can generate one Fanfan science or English daily card from the
Growth `生成` tab without Codex.

Required capability:

- select learner, domain pack, subject, horizon, and available minutes;
- render `graphOptions`, `targetProvisioning`, Profile V2, evidence audit,
  `ownerAudit`, planner readiness, authoring readiness, and evaluation
  readiness;
- draft one plan through Growth routes;
- preview the validated plan item;
- publish one selected low-pressure daily item;
- preserve the published card preview while refreshing context.

Service contract:

- frontend calls Growth routes only;
- routes delegate to services;
- no frontend Gateway calls;
- no browser-side profile diff computation;
- no free-form prompt as the main generation path.

Harness gate:

- `tests/learning-card-generation-context-service.test.js`;
- `tests/learning-plan-publisher-service.test.js`;
- `tests/learning-target-provisioning-service.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-frontend-adapter.test.js`;
- `tests/growth-embedded-layout.test.js`;
- central Home AI embedded-plugin visual harness for mobile scroll, dark mode,
  and progress states.

### Stage 2: Audit And Correction UI

Goal: Owner can understand how a completed card changed the learner profile.

Required capability:

- show plan reason, bounded evidence basis, evaluation summary, evidence
  ledger ids, recent validated plan drafts, published plan links, Profile V2
  state, profile-delta changes, stale-evidence changes, Owner corrections, and
  next recommendation;
- expose bounded correction actions only after rendering the relevant audit
  item;
- refresh from service DTOs after correction write.

Service contract:

- correction writes go only through `learning-owner-correction-service`;
- profile-delta readback goes through persisted public audit DTOs;
- plan-draft readback goes through `learning-plan-audit-service`, not direct
  SQLite access from context, routes, or browser code;
- Profile V2 remains a read projection;
- corrections are additive evidence and do not delete history.

Harness gate:

- `tests/learning-profile-delta-audit-service.test.js`;
- `tests/learning-evidence-audit-service.test.js`;
- `tests/learning-plan-audit-service.test.js`;
- `tests/learning-owner-correction-service.test.js`;
- `tests/learning-card-generation-context-service.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-architecture-boundary.test.js`;
- UI privacy tests that reject raw answers, transcripts, prompts, model output,
  source bodies, private paths, and provider configuration.

### Stage 3: Stage Checkpoint Loop

Goal: formal checkpoints become profile-confidence events without becoming
daily pressure.

Required capability:

- planner may suggest a `stage_checkpoint_plan`;
- Owner can see readiness, cooldown, and coverage nodes;
- activation happens only through stage-assessment controls;
- completion writes high-weight evidence and cooldown state.

Service contract:

- `learning-plan-publisher-service` refuses direct publication of
  `stage_assessment` planner items;
- `learning-stage-assessment-service` owns readiness, eligibility,
  activation, completion, and cooldown;
- stage coverage nodes are graph-bound and explicit.
- `npm run smoke:stage-assessment` provides the service-owned operational
  evidence path: default read-only readiness, explicit `--allow-write` for
  eligibility, activation, and completion, and no direct repository, Gateway,
  plan publication, evaluation, automation, or learner-state bypass from the
  CLI.

Harness gate:

- `tests/learning-stage-assessment-service.test.js`;
- `tests/growth-stage-assessment-smoke-script.test.js`;
- `tests/learning-planner-context-service.test.js`;
- `tests/learning-plan-validation-service.test.js` or the equivalent
  orchestrator/publisher tests;
- `tests/growth-routes.test.js`;
- central visual harness for the Owner stage-assessment controls.

### Stage 4: Multi-Workspace And Domain-Pack Generalization

Goal: the same loop works for any authorized and provisioned learner/domain.

Required capability:

- Owner can see multiple learner targets;
- non-sample targets require active provisions;
- target learner workspace owns profile, evidence, plan, card, and audit rows;
- Owner workspace remains only the actor context;
- graph nodes must belong to the selected provisioned domain pack/subject.

Service contract:

- view-target visibility and target provisioning both pass before planning,
  generation, correction, or publish writes;
- no Owner actor data is mixed into learner state;
- public projections remain summary-only.

Harness gate:

- cross-workspace allow/deny route tests;
- target-switch UI tests;
- architecture guard for actor/target separation;
- service-level vertical harness with a non-sample provisioned target
  implemented in `tests/learning-card-ai-loop-harness.test.js`.

### Stage 5: Supervised Automation Proposal Review

Goal: reduce Owner repetition by proposing the next action while keeping
publication manual and auditable.

Required capability:

- Owner selects a previous completed cycle from audit UI;
- Growth checks audit completeness before any new plan draft;
- Growth creates a stored proposal that links source cycle, new plan draft,
  selected item, target nodes, rationale, and Owner policy;
- Owner can list proposals and record a bounded proposal decision:
  `accepted`, `skipped`, `expired`, or `superseded`;
- an `accepted` proposal returns the explicit Owner publish action, but the
  card is still created only when Owner calls an explicit publish route;
- accepted proposal publish execution records bounded success/failure metadata
  on the proposal and remains idempotent after successful publication;
- proposal creation/decision failure is visible and never publishes a card.

Service contract:

- `POST /api/v1/growth/automation/proposals` is Owner-only and target-visible;
- `GET /api/v1/growth/automation/proposals` is visible-target scoped;
- `POST /api/v1/growth/automation/proposals/:proposalId/decision` is
  Owner-only, target-visible, and records only proposal decision metadata;
- `POST /api/v1/growth/automation/proposals/:proposalId/publish` is
  Owner-only, target-visible, requires `status=accepted`, delegates only to
  `learning-plan-publisher-service.publishPlanItem`, and records bounded
  execution metadata;
- `learning-automation-proposal-service` may call
  `learning-audit-completeness-service`,
  `learning-target-provisioning-service`, and
  `learning-plan-publisher-service.draftPlan`;
- the proposal service must not call Gateway directly, card generation,
  stage-assessment activation, or a scheduler;
- the proposal row is summary-only and stores no raw learner content,
  transcripts, prompts, raw model output, source-document bodies, private
  paths, secrets, or provider configuration.

Harness gate:

- `tests/learning-automation-proposal-service.test.js`;
- `tests/learning-automation-proposal-repository.test.js`;
- `tests/growth-routes.test.js`;
- `tests/growth-architecture-boundary.test.js`;
- repository tests for idempotent summary-only proposal persistence;
- decision tests for valid terminal statuses, duplicate same-status review,
  conflicting terminal review rejection, legacy decision-column migration, and
  privacy-risk decision payload rejection;
- execution tests for accepted-only publish, successful execution metadata,
  idempotent already-published retry, failed/blocked publish metadata, legacy
  execution-column migration, and privacy-risk execution payload rejection;
- privacy tests for rejected raw/private payload fields.

### Stage 6: Supervised Digest And Scheduling Readiness

Goal: reduce Owner repetition without hiding decisions.

Required capability:

- Owner reviews a persisted digest of dry-run candidates before any future
  scheduler is allowed to write;
- the digest shows proposed next cards or weekly sequence candidates, blocked
  reasons, skipped candidates, and explicit Owner actions;
- a future scheduler may publish only stored, validated, reviewed plan items;
- every automatic action links back to plan draft, graph target, evidence
  basis, profile state, validation result, and Owner policy.
- before a scheduler dry-run or writeful worker trusts a prior cycle, it must
  pass the read-only audit-completeness check from
  `learning-audit-completeness-service`.
- scheduler input should normally be a reviewed proposal or proposal policy,
  not an unbounded fresh prompt.

Dry-run-first rule:

- the first scheduler implementation is read-only and locally implemented
  through `learning-automation-scheduler-service`;
- it may inspect accepted proposals, audit completeness, target provisioning,
  and existing execution metadata;
- it must return candidate actions such as `would_publish`, `blocked_audit`,
  `blocked_provisioning`, `skipped_already_published`, or `blocked_policy`;
- it must not call Gateway, author cards, publish plans, enqueue jobs, write
  proposal execution metadata, send notifications, or activate stage
  assessments.

Digest-first rule:

- the scheduling-adjacent persistence layer is implemented locally through
  `learning-automation-digest-service` plus
  `learning_growth_automation_digests`;
- it persists summary-only dry-run review packets with candidates, blocked
  reasons, skipped candidates, and explicit Owner actions;
- digest creation and review must not publish, record proposal execution,
  notify, enqueue, or activate a formal assessment;
- digest review records Owner triage only and does not authorize background
  execution by itself.

Writeful scheduling can be considered only after the dry-run output is useful
in Owner UI, digest review is persisted and visually validated, an active
rollback/failure policy exists for the target scope, the Growth action handoff
backend and platform Action Inbox/Web Push evidence have their own harness,
and visual/release evidence is complete.

Owner-explicit execution rule:

- the first writeful execution boundary is not a scheduler worker;
- it is implemented through
  `learning-automation-scheduler-execution-service` and
  `learning_growth_automation_scheduler_executions`;
- it supports only `owner_explicit_once`;
- it is disabled unless
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`;
- when disabled, it records a bounded blocked execution and performs no
  publication;
- when enabled, it rechecks delivered action handoff, reviewed digest, active
  failure-policy readiness, and read-only scheduler dry-run at execution time;
- it delegates publication only to
  `learning-automation-proposal-service.publishAcceptedProposal`;
- it must not call Gateway, author cards, publish plans directly, enqueue
  jobs, send notifications, activate stage assessments, or inspect SQLite
  tables directly.

Service contract:

- background workers may enqueue or publish only through existing service
  boundaries;
- model drafts still pass validation;
- failures remain visible and retryable;
- automation does not bypass target provisioning, audit readback, audit
  completeness, or stage assessment activation.

Harness gate:

- scheduler dry-run tests before any writeful worker;
- automation digest repository/service/route tests before any writeful worker;
- automation failure-policy repository/service/route tests before any writeful
  worker;
- automation action handoff repository/service/event/route tests before any
  writeful worker;
- automation scheduler execution repository/service/route tests before any
  production enablement of `owner_explicit_once`;
- route tests for Owner-only and visible-target dry-run access;
- architecture guard proving no Gateway, plan publication, card generation,
  proposal execution write outside the accepted-proposal service boundary,
  notification, stage-assessment activation, or table access in the scheduler,
  digest, failure-policy, action-handoff, or scheduler-execution services;
- audit completeness tests;
- failure/retry tests;
- platform notification/action evidence only after the Growth loop itself is
  auditable.

## Data Ownership

| Data | Owner | Rule |
| --- | --- | --- |
| Target provision | `learning-target-provisioning-service` | Required after view-target visibility and before non-sample generation. |
| Knowledge graph | `learning-graph-import-service`, `graph-repository` | Import bounded graph metadata only; do not store raw source-document bodies in runtime. |
| Planner drafts | `learning-plan-publisher-service`, `learning-plan-drafts.js` | Store validated summary-only drafts before publication. |
| Plan audit readback | `learning-plan-audit-service`, `learning-plan-drafts.js` | Return bounded public plan-draft and publication audit DTOs for Owner context and `GET /api/v1/growth/learning-plans/audit` without exposing raw planner payloads. |
| Automation proposals | `learning-automation-proposal-service`, `automation-proposals.js` | Store Owner-reviewed proposal metadata that links a complete source cycle to a new validated plan draft and selected item; record Owner decision and explicit accepted-proposal publish execution metadata without starting a scheduler. |
| Scheduler dry-run | `learning-automation-scheduler-service` | Read accepted proposals, recheck audit completeness and provisioning, and return bounded candidate actions without writes, publication, Gateway, notification, or stage activation. |
| Automation digest | `learning-automation-digest-service`, `automation-digests.js` | Persist summary-only dry-run review packets with candidates, blocked reasons, required Owner actions, and optional review metadata before any writeful scheduler. |
| Automation failure policy | `learning-automation-failure-policy-service`, `automation-failure-policies.js` | Persist summary-only rollback/failure policy, activate draft policies through Owner review, and report active policy readiness as a prerequisite only while keeping `writefulSchedulingAllowed=false`. |
| Automation action handoff | `learning-automation-action-handoff-service`, `automation-action-handoffs.js` | Persist summary-only action handoff records from reviewed digests after active policy readiness; deliver bounded `growth.automation.action_required` metadata through the Growth event boundary and record visible delivery failures without learning-state mutation. |
| Automation scheduler execution | `learning-automation-scheduler-execution-service`, `automation-scheduler-executions.js` | Persist summary-only Owner-explicit execution attempts after delivered handoff, reviewed digest, active policy, and matching dry-run candidate are rechecked; default-disabled by config; delegates only to accepted-proposal publish and records blocked/failed/published outcomes. |
| Automation release readiness | `learning-automation-release-readiness-service`, `automation-release-readiness.js` | Evaluate advisory release-readiness checks and persist optional summary-only snapshots for release review only. It is not a runtime config switch and must not enable execution, scheduling, Gateway calls, evaluation, notification delivery, stage activation, or learner-state writes. |
| Generated cards | `learning-card-generation-service`, `card-authoring-publisher.js` | Publish card rows and graph binding transactionally. |
| Submissions/reflections/audio | `evidence-writes.js`, audio repositories | Store learner evidence through plugin routes; audio playback remains plugin-owned. |
| Evaluations | `growth-evaluation-service`, `evaluation-jobs.js` | One-shot daily evaluation, visible failed state, Owner retry for terminal job failure. |
| Evidence ledger | `learning-evidence-ledger-service` | Summary-only unified evidence across evaluation, reflection, learner signals, formal assessments, and Owner corrections. |
| Evidence audit readback | `learning-evidence-audit-service`, `evidence-ledger.js` | Return bounded public evidence history DTOs for Owner context and `GET /api/v1/growth/evidence/audit` without exposing raw ledger table rows or private summaries. |
| Profile V2 | `learning-profile-v2-service` | Read projection over ledger and optional legacy summary; stale evidence remains explicit. |
| Profile delta | `learning-profile-delta-service`, `profile-delta-audits.js` | Persist before/after bounded deltas for audit; include evidence freshness and stale-reason transitions. |
| Owner corrections | `learning-owner-correction-service` | Additive `owner_reviewed_correction` evidence; no destructive profile edits. |
| Trajectory recommendation | `learning-card-trajectory-service` and recommendation services | Record outcome and next recommendation lifecycle. |
| Stage cycles | `learning-stage-assessment-service`, `stage-assessment-cycles.js` | Own formal activation, completion, and cooldown. |

## Failure Policy

- Invalid model output stops at a visible draft/job/failure state.
- Validation failure must not publish partial plans, cards, evaluations, or
  profile updates.
- Proposal creation or decision failure must not publish a card, activate a
  stage assessment, call authoring/evaluation, or enqueue scheduling work.
- Accepted proposal publish execution must route through the plan publisher,
  record bounded execution metadata, and remain visible when publish fails.
- Scheduler execution failure must record bounded blocked or failed state and
  must not publish unless every execution-time gate passes and the
  default-disabled writeful execution config is explicitly enabled.
- DB transaction failure must roll back the affected write.
- Profile, trajectory, and profile-delta failures must be visible but must not
  duplicate already-persisted evaluation, reward, ledger, or stage-cycle state.
- A button press in the embedded UI must show progress or a visible bounded
  error; silent no-op behavior is invalid.

## Release Gates

Every stage must pass the smallest relevant focused harness first, then the
broad local gate:

```bash
node scripts/check-growth-docs-locality.js
node --test tests/growth-docs-locality.test.js
npm run check
npm test
git diff --check
```

Embedded UI stages must also pass the central visual harness:

```bash
cd /Users/hermes-dev/HermesMobileDev/app
npm run ios:pwa:visual -- \
  --scenario embedded-plugin-shell \
  --plugin-id growth \
  --debug-url http://127.0.0.1:19073/
```

Production planner UI enablement additionally requires:

```bash
npm run smoke:planner-readiness -- \
  --workspace-id weixin_stephen \
  --learner-id fanfan \
  --domain-pack-id uk_hk_curriculum_foundation \
  --domain science \
  --subject science \
  --horizon daily_plan \
  --available-minutes 15 \
  --json
```

Smoke output must remain bounded and must not include raw prompts, raw model
output, learner answers, transcripts, answer keys, source-document bodies,
private paths, secrets, tokens, or provider configuration.

## Immediate Next Slice

The next product-visible implementation slice should still be Stage 1. The
backend now records bounded plan publish-attempt metadata and
audit-completeness readback, so the UI should render both successful published
cards and failed/blocked publish attempts:

1. Add the planner-backed panels to the Owner `生成` tab:
   target/scope, readiness/profile, plan/publish, audit/next step.
2. Wire `GET /api/v1/growth/learning-loop/state` for compact status/next
   action, then wire draft and publish actions to the Owner-only daily-loop
   backend facade.
3. Render context-provided `graphOptions`, `targetProvisioning`, Profile V2,
   evidence audit, `ownerAudit`, and Gateway readiness.
4. Add progress and visible error states for every async action.
5. Render `publishAttempt` from plan/cycle audit DTOs when a draft stays
   unpublished after a failed or blocked publish action.
6. Use `GET /api/v1/growth/learning-cycles/completeness` in audit drilldown
   to show whether the previous cycle has enough evidence for trusted
   follow-up.
7. Add focused frontend adapter/layout tests.
8. Run the central visual harness before production deploy.

Ready-to-start contract for this slice:

| Item | Required shape |
| --- | --- |
| Inputs | Owner actor role, selected target workspace, `learnerId`, `domainPackId`, `domain`, `subject`, `horizon`, `availableMinutes`, and optional target nodes. |
| Existing backend routes | `GET /api/v1/growth/learning-loop/state`, `GET /api/v1/growth/daily-loop/preview`, `POST /api/v1/growth/daily-loop/draft`, `POST /api/v1/growth/daily-loop/publish`, plus drilldown routes `GET /api/v1/growth/card-generation/context`, `GET /api/v1/growth/learning-plans/audit`, `GET /api/v1/growth/evidence/audit`, `GET /api/v1/growth/profile-delta-audits`, `GET /api/v1/growth/profile-corrections`, `GET /api/v1/growth/learning-cycles/audit`, and `GET /api/v1/growth/learning-cycles/completeness`. |
| UI outputs | Compact loop status, one next action, readiness summary, validated plan preview, explicit publish action, generated card link, latest publish-attempt state, audit refresh state, and bounded next-step recommendation. |
| Failure states | Authorization failure, target not visible, target not provisioned, no graph options, Gateway not ready, invalid plan draft, blocked formal-assessment direct publish, authoring failure, DB rollback, publish-attempt failure, and audit-completeness missing evidence. |
| Harness | `tests/learning-loop-state-service.test.js`, `tests/growth-learning-loop-state-smoke-script.test.js`, `tests/learning-daily-loop-service.test.js`, service/route tests for touched behavior, `tests/growth-frontend-adapter.test.js`, `tests/growth-embedded-layout.test.js`, docs-locality checks, broad local gate, and central embedded-plugin visual harness before deployment. |

Backend status: the learning-loop state readback and daily-loop
preview/draft/publish facade are implemented and covered by service, smoke,
route, and architecture harnesses. The remaining Stage 1 work is embedded UI
consumption, frontend adapter/layout coverage, and central visual evidence
before deployment.

After Stage 1 and Stage 2 are implemented, the remaining automation work is
Stage 5 proposal review UI, Stage 6 digest/action review UI, platform
Action Inbox/Web Push evidence, explicit execution enablement evidence, and
the separate background scheduler contract. If backend evidence work is chosen
before more UI, use the release-readiness snapshot boundary described in
`docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`; it must make missing release
evidence visible without enabling execution or scheduling.
Do not start writeful scheduling until proposal review, the closed audit loop,
digest review UI, active failure policy, action handoff, and visual audit
surfaces are implemented, audited, and visually validated. The implemented
`execute-once` backend is an Owner-explicit bridge, not approval for a
background scheduler.

## Documentation And Harness Contract

Every implementation slice must update the durable Growth docs in the same
change as the behavior it changes.

Documentation requirements:

- product rule changes update this roadmap or
  `docs/GROWTH_CARD_GENERATION_RULES.md`;
- service or persistence boundary changes update
  `docs/GROWTH_PLUGIN_ARCHITECTURE.md` and the relevant operating-loop doc;
- model-boundary changes update the model-boundary sections in this roadmap
  and `docs/HOME_AI_PLATFORM_CONTRACT.md`;
- UI flow changes update `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` or
  `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
- rollout status and next steps update `.agent-context/HANDOFF.md`.

Harness requirements:

- service harness proves the deterministic policy and repository writes;
- route harness proves authorization, target visibility, provisioning, and
  bounded DTO shape;
- Owner audit smoke harness proves the service-owned read-only audit path,
  explicit correction write gate, privacy rejection, and no direct repository,
  Gateway, generation, evaluation, scheduler, notification, or stage activation
  from CLI evidence collection;
- AI harness covers valid stream, valid JSON, empty output, invalid JSON,
  timeout, privacy-risk output, repair failure, and transaction failure for
  model-entered boundaries;
- UI adapter/layout harness proves progress, visible errors, mobile scroll,
  and dark-mode states before production UI rollout;
- central Home AI embedded-plugin visual harness is required for mobile visual
  release evidence;
- docs-locality harness runs when Growth docs move or product rules change.

An implementation slice is not considered closed if the code passes but the
matching documentation and smallest relevant harness are missing.
