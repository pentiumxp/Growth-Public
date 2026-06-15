# Growth AI Learning System Scheme

Last updated: 2026-06-15.

## Purpose

This document is the durable system scheme for Growth's AI-guided learning
product. It captures the product direction that should guide later
implementation threads without relying on chat history.

The scheme starts with Fanfan and the UK/HK curriculum foundation graph, but
the architecture target is any authorized learner workspace, domain pack,
subject, and knowledge graph after Home AI view-target visibility and Growth
learning-target provisioning both pass.

Read this document before choosing an implementation slice. Then use:

- `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` for the closed-loop product
  contract;
- `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` for package ordering and
  definition of done;
- `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` for service, state,
  DTO, and harness details;
- `docs/GROWTH_AI_LEARNING_ROADMAP.md` for stage gates and release levels;
- `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` for the current next-stage
  implementation choice, Fanfan science playbook, release-readiness semantics,
  and harness matrix;
- `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` before changing
  supervised scheduler tick behavior or any future background worker;
- `docs/GROWTH_PLUGIN_ARCHITECTURE.md` for service-first module ownership.

## Product Thesis

Growth is not a generic card generator. Growth should be a supervised,
AI-guided learning operating loop:

1. observe bounded learner evidence;
2. project the learner's current capability profile;
3. choose the next learning action from graph, evidence, freshness, pressure,
   and Owner policy;
4. author a low-pressure card or formal checkpoint;
5. evaluate the current evidence once;
6. update profile, audit, and next recommendation;
7. repeat with the updated durable state.

The expected long-term behavior is cumulative. Daily work should be small,
scientific, auditable, and low-pressure, while weeks and months of evidence
produce meaningful capability progress.

## Learning Program Model

Growth should behave like a supervised learning program engine, not like a
prompt-to-card tool.

Fanfan is the first concrete operating program:

- learner id: `fanfan`;
- first graph foundation: UK/HK curriculum foundation graph;
- first product verticals: English daily practice and science daily practice;
- first Owner workflow: select scope, draft a plan, publish one daily card,
  let the learner complete it, inspect the audit, and use the updated profile
  for the next plan.

The long-term target is the same loop for any authorized learner workspace,
domain pack, subject, and graph. The system should therefore treat learner,
domain pack, domain, subject, horizon, time budget, graph nodes, and Owner
policy as parameters instead of Fanfan-only constants.

The program runs at three time scales:

| Time scale | Product role | Evidence role | Owner control |
| --- | --- | --- | --- |
| Daily observation loop | 10-15 minute low-pressure practice or repair card. | Low/medium-weight evidence for confidence, misconceptions, freshness, and pressure. | Owner explicitly publishes one item or later approves one proposed item. |
| Stage checkpoint loop | 25-30 minute formal checkpoint after enough evidence and cooldown. | High-weight evidence across explicit graph coverage nodes. | Owner activates through `learning-stage-assessment-service`; daily publish cannot silently create it. |
| Program evolution loop | Weekly/monthly progression across graph regions and subjects. | Trend over evidence ledger, Profile V2, stale strengths, repeated weaknesses, corrections, and formal checkpoints. | Owner reviews scope, policy, release evidence, and any automation readiness before broader rollout. |

AI participates in each time scale only through Gateway-backed drafts:

- planner drafts the next objective and role from summary-only state;
- authoring drafts the learner-facing card from a validated plan or graph
  plan;
- evaluation drafts feedback for the current authenticated evidence only.

The durable program state is owned by Growth services and repositories. A model
must never become the source of truth for Profile V2, target provisioning,
mastery, stage eligibility, automation permission, or release readiness.

Success is measured by closed-loop traceability:

- every learner-facing action has graph scope, profile basis, and Owner policy;
- every model-assisted decision has a validated draft id or visible failure;
- every completed card produces bounded evidence or a visible failure state;
- every profile change can be audited from persisted summary-only records;
- every next recommendation can be explained without Codex thread memory,
  browser-local hidden state, raw prompts, or raw model transcripts.

## Strategic Product Shape

Growth should be designed as a learning control system with five cooperating
planes:

| Plane | Responsibility | Primary evidence |
| --- | --- | --- |
| Scope and graph | Decide which learner, domain pack, subject, and graph region are allowed. | View-target visibility, target provisioning, graph nodes, prerequisites, and domain-pack provenance. |
| Learner state | Project what Growth currently believes and how confident that belief is. | Evidence ledger, Profile V2, stale evidence, formal assessment evidence, experience signals, and Owner corrections. |
| Model drafts | Ask Gateway for bounded planning, authoring, or evaluation drafts. | Versioned draft schemas, model-boundary readiness, validation results, and repair/failure metadata. |
| Learning action | Publish or activate one learner-facing action through Owner-controlled service boundaries. | Plan drafts, publish attempts, generated card bindings, stage-assessment cycles, submissions, evaluations, reflections, and rewards. |
| Audit and next step | Explain what changed and decide what should happen next. | Cycle audit, profile-delta audit, correction history, recommendation lifecycle, proposal records, and release-readiness evidence. |

These planes must stay separable. Browser code can render and submit Owner
intent, but it must not rebuild Profile V2, compute mastery, assemble prompts,
inspect SQLite tables, or call Gateway. Routes can authorize, normalize, and
delegate, but learning policy belongs in services and repositories.
The compact Owner state surface for the daily workbench is
`GET /api/v1/growth/learning-loop/state`, backed by
`learning-loop-state-service`. It returns `growth.learningLoopState.v1` from
daily-loop preview plus stage-assessment readiness and is summary-only,
no-write, and non-model.

The current product state should therefore be described precisely:

- backend-capable means services and harnesses can run the loop from persisted
  state;
- browser-operable means Owner and learner can complete the loop from the
  embedded plugin without Codex or database-console work;
- release-reviewable means product, platform, visual, production controlled
  daily-loop write smoke, production cycle-history smoke, production Owner
  audit smoke, production learner-cycle audit smoke, production dry-run, and harness evidence can be
  inspected by a human release decision; controlled daily-loop write smoke may
  be collected through the explicit non-default `daily_loop_write`
  release-bundle task, while Owner audit smoke is collected through the default
  `owner_audit` bundle task and learner-cycle audit smoke is collected through
  the default audit-only `learner_cycle` bundle task. These collections are
  evidence only and not automation permission;
- writeful automation allowed means a later, explicit release-management
  boundary has approved runtime config after all previous evidence exists.

Those states are intentionally not the same. A backend implementation or a
release-readiness snapshot must not be treated as permission to start
background scheduling.

## Non-Negotiable Principles

### AI-Guided, Not AI-Unbounded

Gateway can assist with planning, card authoring, and evaluation. It cannot be
allowed to mutate learner state directly.

Every model response must become a draft first. Growth validates the draft
before writing plan, card, evaluation, profile, or automation records.

### Persistent State Is The Source Of Truth

The next card must be explainable from persisted summary-only records:

- knowledge graph nodes and prerequisites;
- target/domain-pack provisions;
- evidence ledger rows;
- Profile V2 projection;
- plan drafts and publish attempts;
- generated card and graph binding ids;
- evaluation and reward records;
- profile-delta audits;
- Owner corrections;
- trajectory and recommendation lifecycle;
- proposal, digest, action handoff, Owner-explicit scheduler execution
  records, and future background scheduler records.

Codex thread memory, hidden browser state, raw prompt text, or transient model
output must not be required to explain a learner decision.

### Low Pressure By Default

Daily cards are practice and observation. They should take about 10-15 minutes
and use:

- one learner submission;
- one evaluation;
- one optional reflection;
- completion after the first evaluation regardless of score;
- score-proportional reward;
- no retry-until-pass gate.

A low score is evidence for repair, support, misconception, freshness, or Owner
review. It is not a child-facing failure loop.

### Formal Assessment Stays Separate

Stage assessments are profile checkpoints. They should take about 25-30
minutes, declare explicit graph coverage, carry higher evidence weight, and
run only through `learning-stage-assessment-service`.

The planner may suggest a stage checkpoint, but daily plan publication must
not silently publish a formal assessment.

### Owner Can Audit And Correct

Owner must be able to answer:

- why this card was selected now;
- what graph targets and evidence basis were used;
- which model boundaries ran;
- what durable records were written;
- what changed in Profile V2;
- what stayed uncertain or stale;
- whether an Owner correction was added;
- what the next recommendation is and why.

Owner correction is additive evidence. It does not delete historical learner
evidence or mutate Profile V2 directly from browser code.

### Growth Owns Learning Policy

Home AI owns embedding, same-origin proxying, workspace grants, shared Gateway
access/config, central deployment tooling, platform Action Inbox/Web Push, and
visual harnesses.

Growth owns learning policy, card authoring orchestration, learner evidence
writes, evaluation processing, evidence ledger, profile projection, plan
drafts, audit readback, automation proposals, digest/failure policy/action
handoff records, default-disabled Owner-explicit scheduler execution policy,
and future background scheduler policy.

Growth may use Home AI Gateway access and platform event delivery boundaries.
Growth must not import old Home AI Growth route/server internals or call model
vendors directly.

## Core Loop

The target loop is:

1. Owner selects learner workspace, learner id, domain pack, domain, subject,
   horizon, and available minutes.
2. Growth verifies actor visibility through Home AI view-target rules.
3. Growth verifies target/domain-pack/subject provisioning.
4. Growth projects graph options, Profile V2, evidence audit, plan audit,
   stage readiness, pressure signals, and Gateway readiness.
5. Gateway drafts a plan through the Growth planner boundary.
6. Growth validates the plan and persists a summary-only draft.
7. Owner explicitly publishes one selected daily item, or activates a formal
   checkpoint through stage-assessment controls.
8. Gateway authors the card through the Growth authoring boundary.
9. Learner completes one daily practice flow or formal assessment flow.
10. Gateway evaluates the current evidence once through the Growth evaluation
    boundary.
11. Growth writes evaluation, reward, evidence ledger, Profile V2 effects,
    trajectory, recommendation lifecycle, and profile-delta audit records.
12. Owner reviews the cycle audit and may add bounded correction evidence.
13. The next planner run uses the updated persisted state.

The loop is product-complete only when steps 1-13 are operable from the Growth
plugin UI and the audit can explain the next action from durable records.

## Learner State Model

Profile V2 is a read projection over evidence. It is not a browser-owned
object and not a direct model output.

Profile V2 should summarize:

- graph-node capability state;
- evidence count, evidence weight, score bands, and confidence;
- separate freshness for daily evidence and formal assessment evidence;
- stale strengths that should become low-pressure review hints;
- weaknesses, misconceptions, uncertainty, and pressure signals;
- learner experience signals such as `too_hard`, `not_learned`, or fatigue;
- Owner-reviewed correction evidence;
- planner hints for repair, stabilization, review, new-node introduction, or
  stage-checkpoint readiness.

Interpretation rules:

- unobserved graph nodes are unknown, not weak;
- one daily answer is low-confidence evidence, not stable mastery proof;
- repeated daily evidence can gradually raise confidence;
- formal stage assessments carry higher weight because coverage and cooldown
  are explicit;
- stale evidence lowers confidence or triggers review;
- Owner corrections adjust future projection as auditable evidence.

## Model-Entered Steps

Only three steps may enter a model, and all three must use Gateway.

| Step | Service boundary | Summary-only input | Draft output | Durable write gate |
| --- | --- | --- | --- | --- |
| Plan | `learning-plan-orchestrator-service`, `growth-gateway-planner-client` | Profile V2, stale evidence, recent evidence summaries, graph candidates, target provisioning, horizon, time budget, pressure policy. | `growth.learningPlanDraft.v1`. | `learning-plan-validation-service`, then `learning-plan-publisher-service` stores the draft. |
| Author | `learning-card-authoring-service`, `growth-gateway-authoring-client` | Validated planner item or graph plan, bounded graph/history/profile summaries, role, difficulty, support level, evidence requirements. | Versioned card authoring draft with `teachingFlow`. | `learning-card-authoring-validation-service`, then `card-authoring-publisher` writes card rows and graph binding transactionally. |
| Evaluate | `learning-card-evaluation-service`, `growth-gateway-evaluation-client` | Current authenticated learner evidence for the current card, bounded audio metadata, card policy, graph metadata, stage policy. | `growth.card.evaluation.v1`. | Evaluation validation, then `growth-evaluation-service` writes evaluation and downstream state. |

Planning and authoring must not receive raw historical answers, full
transcripts, hidden answer keys, raw prompts, raw model output,
source-document bodies, private paths, secrets, tokens, cookies, or provider
configuration.

Evaluation may receive only the current answer payload required to grade the
current card.

## Card Families

### Daily Practice Cards

Daily practice cards are the default routine loop.

Required policy:

- expected duration: 10-15 minutes;
- completion policy: `daily_score_once`;
- one active submission box;
- one evaluation result;
- one optional reflection box after evaluation;
- completion after first evaluation regardless of score;
- score-proportional reward;
- low or medium evidence weight;
- low score becomes planning evidence, not a retry gate.

The learner-facing flow is:

1. Submit one response.
2. Receive one evaluation.
3. Optionally add one reflection.

Each step should expose at most one active submission box. The UI must not
create multiple competing answer boxes in one stage.

### Stage Assessment Cards

Stage assessment cards are formal checkpoints.

Required policy:

- expected duration: 25-30 minutes;
- activation only through `learning-stage-assessment-service`;
- explicit graph coverage nodes;
- high evidence weight;
- completion and cooldown owned by the stage-assessment service;
- planner suggestions remain suggestions until Owner activates the checkpoint.

Formal assessment results can shift Profile V2 more strongly than daily
practice, but they remain auditable and correctable.

## Owner Modes

Growth should expose five Owner modes over the same service-owned state.

| Mode | Owner question | Required behavior |
| --- | --- | --- |
| Generate | What should this learner do next today? | Select target scope, show readiness, draft, preview, publish one daily item, and show progress/failure. |
| Audit | Why did this card happen and what changed? | Render plan reason, evidence basis, publish attempt, evaluation, profile delta, correction history, and next recommendation. |
| Assess | Is this learner ready for a formal checkpoint? | Show readiness, coverage, cooldown, and activation controls owned by stage assessment. |
| Review | Is Growth's profile judgment correct? | Add bounded Owner correction or confirmation evidence without editing raw history. |
| Automate | Which repeated Owner actions can be safely proposed or scheduled later? | Start with proposals, dry-run digest, failure policy, and action handoff before any writeful scheduler. |

The first complete product path is Fanfan science or English daily practice:
Owner selects Fanfan, drafts a plan, publishes one daily card, learner
completes it, and Owner inspects the audit without Codex or database-console
work.

## Automation Maturity

Automation must grow through supervised levels. It must not begin as a
background scheduler.

| Level | Capability | Write permission |
| --- | --- | --- |
| A0: Manual daily loop | Owner drafts and publishes one daily item. | Owner explicit publish only. |
| A1: Proposal | Growth proposes a next action from a complete previous cycle. | No publish during proposal or decision. |
| A2: Accepted proposal publish | Owner explicitly publishes an accepted proposal. | Delegates to plan publisher and records execution metadata. |
| A3: Scheduler dry-run | Growth lists what would publish and why. | No writes and no publish. |
| A4: Digest review | Owner reviews persisted dry-run packets. | Review metadata only. |
| A5: Failure policy and action handoff | Growth records active rollback/failure policy and delivers bounded action metadata. | No learning-state mutation. |
| A6: Owner-explicit execution | Owner can execute one delivered handoff action after every gate is rechecked. | Default-disabled; when enabled, delegates only to accepted-proposal publish and records execution audit. |
| A7: Background scheduler contract | Default-disabled supervised tick over delivered handoff actions, Owner-reviewed persistent worker targets, and default-disabled worker leases, with any future unattended worker kept separate. | Delegates only to the execution service; production worker use requires reviewed enabled targets, release evidence, and explicit config. |
| A8: Release-readiness evidence | Growth summarizes product, platform, visual, stage-checkpoint smoke, production proposal smoke, production cycle-history smoke, production Owner audit smoke, production controlled daily-loop write smoke, production learner-cycle audit smoke, production dry-run, config, reviewed-target, explicit release evidence, and bounded remediation fields. | No write permission; advisory release review artifact and next-action guidance only. |

Writeful scheduling can be considered only after:

- Owner daily UI is product-usable;
- audit/correction UI is product-usable;
- proposal review UI exists;
- scheduler dry-run output is persisted in digest records;
- active failure policy exists for the target scope;
- action handoff and platform notification evidence exist;
- visual evidence exists through the central Home AI embedded-plugin harness;
- service, route, repository, privacy, race/idempotency, and architecture
  harnesses pass.
- reviewed enabled worker target rows exist for the exact learner/domain/horizon
  scope; local environment JSON target lists are not production approval.
- `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` has been
  updated for any supervised tick or future worker behavior.
- `learning-automation-release-readiness-service` reports no missing or blocked
  release-review checks, while still keeping `writefulSchedulingAllowed=false`.

## Durable Ownership Map

| Capability | Owning boundary |
| --- | --- |
| Target visibility | Home AI plugin workspace grant and Growth view-target projection. |
| Learning enablement | `learning-target-provisioning-service`. |
| Knowledge graph | `learning-graph-import-service`, `graph-repository.js`. |
| Planner input | `learning-planner-context-service`. |
| Plan draft and publish attempt | `learning-plan-publisher-service`, `learning-plan-drafts.js`. |
| Card authoring and publication | `learning-card-generation-service`, `learning-card-authoring-service`, `card-authoring-publisher.js`. |
| Submission, reflection, audio | Growth evidence write routes and SQLite evidence/audio repositories. |
| Evaluation | `growth-evaluation-service`, `learning-card-evaluation-service`, evaluation job repositories. |
| Reward | SQLite reward repository and Growth reward services. |
| Evidence ledger | `learning-evidence-ledger-service`, `evidence-ledger.js`. |
| Profile projection | `learning-profile-v2-service`. |
| Profile delta | `learning-profile-delta-service`, `profile-delta-audits.js`. |
| Owner correction | `learning-owner-correction-service`. |
| Cycle audit | `learning-cycle-audit-service`. |
| Audit completeness | `learning-audit-completeness-service`. |
| Automation proposal | `learning-automation-proposal-service`, `automation-proposals.js`. |
| Scheduler dry-run | `learning-automation-scheduler-service`. |
| Automation digest | `learning-automation-digest-service`, `automation-digests.js`. |
| Failure policy | `learning-automation-failure-policy-service`, `automation-failure-policies.js`. |
| Action handoff | `learning-automation-action-handoff-service`, `automation-action-handoffs.js`, `growth-event-service`. |
| Owner-explicit scheduler execution | `learning-automation-scheduler-execution-service`, `automation-scheduler-executions.js`; default-disabled and delegates only to accepted-proposal publish after execution-time gate rechecks. |
| Background scheduler run/tick | `learning-automation-scheduler-run-service`, `automation-scheduler-runs.js`; default-disabled and delegates delivered handoff actions only to Owner-explicit execution. |
| Background scheduler worker target | `learning-automation-scheduler-worker-target-service`, `automation-scheduler-worker-targets.js`; Owner-reviewed summary-only target configuration for any future worker. |
| Background scheduler worker lease | `learning-automation-scheduler-worker-service`, `automation-scheduler-worker-leases.js`; default-disabled local lease/timer mechanics over reviewed targets, delegating only to scheduler run. |
| Release-readiness evidence | `learning-automation-release-readiness-service`, `automation-release-readiness.js`; advisory summary-only release-review checks, remediation plan fields, and snapshots. |

Routes must remain request parsing, authorization, visible-target resolution,
service dispatch, and bounded response formatting. Browser code must not
compute learner mastery, assemble model prompts, call Gateway, or read SQLite
tables.

## Implementation Strategy

The next implementation sequence should optimize for a complete observable
loop before broader automation.

The durable next-stage decision is recorded in
`docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`. The preferred path is to finish
the Owner-supervised daily browser loop first. A backend-only path is allowed
only when it creates release-readiness evidence without enabling scheduling,
publication, Gateway calls, evaluation, or learner-state mutation.

### Package 1: Owner-Supervised Daily UI

Goal: Owner can create one Fanfan science or English daily card from the
Growth plugin UI without Codex.

Required shape:

- select visible target, learner id, domain pack, domain, subject, horizon,
  and available minutes;
- show the compact `growth.learningLoopState.v1` state from
  `GET /api/v1/growth/learning-loop/state` as the top-level status/next-action
  readback instead of recomputing readiness in browser code;
- render target provisioning, graph options, Profile V2, evidence audit,
  plan audit, planner readiness, authoring readiness, and evaluation readiness;
- draft through `POST /api/v1/growth/daily-loop/draft`;
- preview target nodes, role, difficulty, support, minutes, rationale, and
  basis evidence ids;
- publish through `POST /api/v1/growth/daily-loop/publish`;
- show progress and bounded errors for every async action;
- preserve generated-card preview and publish-attempt failure state;
- pass frontend adapter/layout tests and central visual evidence before
  production deployment.

Current status: the minimal browser operation path is implemented for Fanfan
sample targets. Owner can load context, inspect learning-loop state, draft one
daily plan, preview the selected plan item, publish it, and refresh the board
and loop state from the plugin UI. The tab now also exposes Owner audit and
single-card audit/completeness drilldown over the Growth service facades. The
remaining Package 1 work is richer scope selection, explicit provision
controls, and central visual/release evidence before production deployment.

### Package 2: Owner Audit And Correction UI

Goal: Owner can explain and correct the completed card cycle.

Current implementation status: the first embedded UI slice is implemented in
the Owner `生成` tab. It renders `ownerAudit` from
`GET /api/v1/growth/card-generation/context`, shows plan audit, persisted
profile-delta summaries, correction history, and writes bounded Owner
corrections through `POST /api/v1/growth/profile-corrections`. The UI refreshes
context and `growth.learningLoopState.v1` after a successful correction and
does not mutate Profile V2 locally. The same tab now also derives a bounded
single-cycle query and calls
`GET /api/v1/growth/learning-cycles/audit` plus
`GET /api/v1/growth/learning-cycles/completeness` through the browser API
client. It renders only summary counts, timeline rows, completeness findings,
and missing-required state. Backend selectable history is implemented through
`learning-cycle-history-service`, `GET /api/v1/growth/learning-cycles/history`,
and `npm run smoke:cycle-history`; the browser still needs richer controls for
choosing older cycles from that DTO.

Required shape:

- render cycle audit, evidence audit, persisted profile-delta audit,
  correction history, completeness state, and next recommendation;
- correction writes go only through `learning-owner-correction-service`;
- audit DTOs remain summary-only;
- UI privacy tests reject raw answers, transcripts, prompts, model output,
  source bodies, private paths, credentials, and provider configuration.

Remaining Package 2 work: browser richer selection/history controls for
choosing older cycles after the current generated-card cycle is no longer the
primary context.
Central `embedded-plugin-shell` visual evidence already passed for
`pluginId=growth` on 2026-06-15, and the Owner target-provision controls were
deployed to Mac production with no-write Owner-loop smoke. Full automation
release review remains incomplete.

### Package 3: Stage Checkpoint UI

Goal: formal checkpoints update profile confidence without becoming daily
pressure.

Required shape:

- planner can suggest checkpoint readiness;
- Owner sees coverage, readiness, cooldown, and activation controls;
- activation happens only through `learning-stage-assessment-service`;
- direct stage-assessment publication from daily plan remains blocked.

### Package 4: Multi-Workspace And Domain-Pack Generalization

Goal: the same loop works for any visible and provisioned learner/domain.

Required shape:

- visible targets are selectable;
- non-sample targets fail closed until explicitly provisioned;
- target workspace owns profile, plan, card, evidence, and audit rows;
- actor workspace remains only actor context;
- graph nodes must belong to the selected provisioned graph context.

### Package 5: Proposal Review UI

Goal: Growth can suggest repeated next actions while Owner still controls
publication.

Required shape:

- source cycle is required;
- audit completeness and target provisioning pass before drafting;
- proposal persists source ids, plan draft id, selected item, rationale,
  target nodes, Owner policy, decision, and execution metadata;
- Owner can accept, skip, expire, supersede, and explicitly publish accepted
  proposals;
- no scheduler starts from proposal creation or decision.

### Package 6: Digest, Failure Policy, Action Handoff UI

Goal: scheduling candidates are reviewable before any writeful automation.

Required shape:

- scheduler dry-run remains read-only;
- digest persists summary-only would-publish, blocked, skipped, and required
  action packets;
- active failure policy is visible as a prerequisite only;
- action handoff records bounded platform notification metadata;
- no publish, queue, model call, stage activation, or learner-state mutation
  occurs in this package.

### Package 7: Owner-Explicit Scheduler Execution

Goal: controlled execution can perform one Owner-approved action only after all
previous review, rollback, action handoff, and dry-run gates are rechecked.
This package is not a background scheduler.

Implemented backend shape:

- default-disabled `owner_explicit_once` execution boundary;
- delivered handoff, reviewed digest, active failure-policy readiness, and
  scheduler dry-run are rechecked at execution time;
- accepted proposal publication delegates only to
  `learning-automation-proposal-service.publishAcceptedProposal`;
- `learning_growth_automation_scheduler_executions` stores summary-only
  started/published/failed/blocked/skipped audit rows.

Remaining product shape:

- default disabled unless explicit release config and Owner policy allow it;
- consumes reviewed digest/action/proposal records;
- rechecks target visibility, provisioning, source-cycle completeness,
  proposal status, and active failure policy at execution time;
- delegates publication only to accepted-proposal publish;
- writes bounded execution metadata;
- has idempotency, race, rollback, and failure tests;
- has production dry-run evidence before enabling writeful mode;
- keeps background scheduling as a separate future contract.

### Package 8: Reviewed Worker Targets And Background Scheduler Contract

Goal: prove the future scheduler target and lease mechanics without enabling
unattended learning actions.

Required shape:

- Owner can propose a worker target only for a visible and provisioned
  learner/domain/horizon scope;
- Owner can review the target to `enabled`, `disabled`, or `archived`;
- enabling rechecks target provisioning;
- the worker service consumes reviewed enabled targets before any local
  environment fallback;
- scheduler ticks remain default-disabled and delegate only to the execution
  service;
- production worker enablement still requires platform action evidence,
  central visual evidence, production dry-run evidence, and explicit release
  approval.

## Harness Contract

Every package must include documentation and harness updates. A code-only
slice is not complete.

Minimum harness by boundary:

| Boundary | Required evidence |
| --- | --- |
| Model boundary | Fake Gateway valid stream, valid JSON, empty output, invalid JSON, timeout, privacy-risk output, and repair failure. |
| Service boundary | Focused service tests for policy, validation, idempotency, dependency calls, and visible failure. |
| Repository boundary | Transaction rollback, schema migration, idempotency, summary-only privacy class, and privacy-risk key rejection. |
| Route boundary | Owner/workspace authorization, visible-target allow/deny, bounded input normalization, and route-as-glue architecture. |
| Vertical loop | Fanfan science daily path from plan draft to card publish, learner evidence, evaluation, ledger, Profile V2, profile delta, profile-feedback evidence, and next loop-state readback. |
| Profile feedback evidence | `tests/learning-profile-feedback-evidence-service.test.js`, `tests/growth-profile-feedback-smoke-script.test.js`, the Fanfan science post-cycle assertion in `tests/learning-card-ai-loop-harness.test.js`, and `npm run smoke:profile-feedback` prove completed-cycle audit/evidence/profile-delta/Profile V2/recommendation/next-state readback without Gateway calls or writes. |
| Cycle history readback | `tests/learning-cycle-history-service.test.js`, `tests/growth-cycle-history-smoke-script.test.js`, route/architecture guards, and `npm run smoke:cycle-history` prove selectable historical-cycle readback from public audit services without Gateway calls, writes, direct repository access, publication, generation, evaluation, scheduling, notification, stage activation, or learner-state mutation. |
| Learner daily-cycle smoke | `tests/growth-learner-cycle-smoke-script.test.js` and `npm run smoke:learner-cycle` prove the service-owned submit -> evaluate -> reflect -> audit path. The CLI defaults to no-write audit, requires `--allow-write` for learner-state writes, and returns summary-only ids/status/counts/findings without learner text, transcripts, raw prompts, answer keys, raw model output, credentials, or provider config. |
| Owner audit/correction | `tests/growth-owner-audit-smoke-script.test.js` and `npm run smoke:owner-audit` prove read-only cycle audit/completeness/correction readback by default, explicit `--allow-write` before correction writes, privacy-risk input rejection, default release-bundle `owner_audit` collection into `productionOwnerAuditSmokeEvidence`, and no direct repository, Gateway, generation, evaluation, scheduler, notification, or stage-activation calls from the CLI. |
| Non-sample loop | Visible but unprovisioned target blocks before model calls; explicit provision enables; wrong subject blocks; target workspace owns rows. |
| UI boundary | Progress states, visible errors, mobile scroll, dark-mode contrast, no hidden controls, and no silent generate action. |
| Automation boundary | Proposal, scheduler dry-run, digest, failure policy, action handoff, Owner-explicit scheduler execution, and future background scheduling prove no forbidden direct Gateway/card-generation/stage-activation/table access. |
| Docs locality | `node scripts/check-growth-docs-locality.js` and `node --test tests/growth-docs-locality.test.js`. |
| Release visual | Central Home AI embedded-plugin visual harness for mobile and embedded shell before production UI deployment. |

Broad local validation after a completed implementation package:

```bash
npm run check
npm test
git diff --check
```

## Current State And Immediate Decision

The current backend foundation already includes the main service boundaries
for graph import, card authoring, evaluation, evidence ledger, Profile V2,
profile-delta audit, profile-feedback evidence, plan draft/publish, cycle
audit, cycle history, audit completeness, Owner daily-loop facade, supervised proposals,
scheduler dry-run, automation digests, failure policy, action handoff, and
default-disabled Owner-explicit scheduler execution.

The browser Owner loop now shows the compact learning-loop state/next-action
readback in the `生成` tab and exposes a minimal supervised daily-loop
draft/publish path:

- `规划下一张` calls `POST /api/v1/growth/daily-loop/draft`;
- the UI renders a bounded plan draft preview with selected item, target
  nodes, role, difficulty, evidence requirements, and publish-attempt state;
- `发布为卡片` calls `POST /api/v1/growth/daily-loop/publish`;
- after publication the browser refreshes the board, card-generation context,
  and `growth.learningLoopState.v1` readback.
- the same `生成` tab now renders the `ownerAudit` context DTO as an
  audit/correction panel and writes bounded Owner correction evidence through
  `POST /api/v1/growth/profile-corrections` before refreshing context and loop
  state;
- the same `生成` tab now renders single-card cycle audit/completeness
  drilldown over `learning-cycles/audit` and `learning-cycles/completeness`,
  using summary-only timeline/findings and keeping `readyForAutomation` as
  evidence only, not an automation permission.
- backend `learning-cycles/history` now returns selectable summary-only cycle
  rows for older-cycle history controls, but the browser control itself remains
  a later product slice.

The product is not complete because it still lacks browser older-cycle selection UI,
proposal/digest/action UI, central visual evidence, platform action evidence,
and execution enablement evidence. Scope/provision controls now exist in the
Owner `生成` tab over the Growth context and domain-pack provision service
facades.

Therefore the recommended next product-visible slice is still:

1. finish Owner-supervised daily UI details over the existing daily-loop
   facade, especially browser older-cycle selection and production visual
   evidence;
2. then add older-cycle selection/history controls over the implemented
   history/audit/completeness readbacks;
3. then harden formal checkpoint controls;
4. then generalize target/domain-pack UI beyond the current explicit provision
   controls and service harness;
5. then move to proposal/digest/action/execution UI;
6. only after those gates consider background writeful scheduling.

If the next slice is backend-only, it must still preserve the same order of
safety gates and must not enable automatic publication before the Owner UI and
audit loop are usable.
