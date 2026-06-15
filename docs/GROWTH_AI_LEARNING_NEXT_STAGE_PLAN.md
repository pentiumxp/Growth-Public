# Growth AI Learning Next-Stage Plan

Last updated: 2026-06-15.

## Purpose

This document is the durable next-stage plan for Growth's supervised
AI-learning system. It records the current product direction and the immediate
implementation choices so later work does not depend on chat history.

Use this file after reading:

- `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` for the system thesis;
- `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` for the closed-loop contract;
- `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` for package-level
  execution rules;
- `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` for service, DTO,
  persistence, and harness details;
- `docs/GROWTH_AI_LEARNING_ROADMAP.md` for capability levels and stage gates;
- `docs/GROWTH_PLUGIN_ARCHITECTURE.md` for Service First boundaries.

The plan starts with Fanfan and the UK/HK curriculum foundation graph. The
architecture target remains any authorized learner workspace, domain pack,
subject, and knowledge graph after Home AI view-target visibility and Growth
target provisioning both pass.

## Target Outcome

Growth should not be measured by whether it can generate a card once. The
target outcome is an auditable learning operating loop:

1. observe summary-only learner evidence;
2. project the learner profile from persisted records;
3. choose the next learning action through Gateway-assisted planning;
4. validate and store the plan as a draft;
5. let Owner explicitly publish a low-pressure daily card or activate a formal
   checkpoint;
6. author the card through Gateway;
7. let the learner complete one bounded flow;
8. evaluate current evidence once through Gateway;
9. write evaluation, reward, evidence ledger, profile, recommendation, and
   profile-delta audit records;
10. let Owner review and correct the audit;
11. use the updated durable state for the next plan.

The operating principle is scientific accumulation: daily work stays small and
low-pressure, while weeks and months of evidence produce stronger profile
claims.

## End-To-End Mechanism Contract

The learning mechanism is a closed loop over durable records, not a one-off
card generator.

| Loop step | Durable source or sink | Model access |
| --- | --- | --- |
| Scope selection | Home AI view target plus Growth target provisioning. | None. |
| Knowledge selection | Imported graph nodes, prerequisites, domain-pack/subject metadata, and target provision. | Planner receives bounded node summaries only. |
| Profile projection | Evidence ledger, formal assessment evidence, learner signals, stale evidence, and Owner corrections. | Planner receives Profile V2 summaries only. |
| Plan | Gateway planner drafts a next action with horizon, minutes, role, support level, and evidence basis. | Gateway through `growth-gateway-planner-client`. |
| Validate plan | Schema, graph binding, horizon policy, pressure policy, and privacy validation. | None after draft output. |
| Publish daily card | Owner explicitly publishes one validated daily item through the plan publisher and card generation service. | Authoring Gateway only inside Growth card authoring. |
| Learner completes | One submission, one evaluation, one optional reflection for daily practice. Audio metadata and BLOB storage stay plugin-owned. | Evaluation Gateway receives only current-card evidence. |
| Persist evidence | Evaluation, reward, evidence ledger, Profile V2 effects, trajectory, recommendation lifecycle, and profile-delta audit. | None. |
| Owner audit | Cycle audit, profile delta, evidence audit, completeness, and correction readback. | None. |
| Next plan | The next planner run consumes the updated summary-only state. | Planner Gateway only. |

Daily practice is the high-frequency evidence loop. Stage assessments are
separate checkpoint loops with explicit activation, coverage, higher evidence
weight, completion, and cooldown owned by `learning-stage-assessment-service`.
The planner may recommend a stage checkpoint, but daily publication must not
silently become a formal assessment.

The system is considered closed only when a learner cycle can answer these
questions from persisted state:

- what graph nodes and prerequisites were selected;
- what Profile V2 evidence, stale evidence, and Owner corrections influenced
  the decision;
- which model boundaries ran and what validated draft ids were accepted;
- which card, submission, evaluation, reward, ledger, profile-delta, and
  recommendation records were written;
- what remains uncertain, stale, weak, or ready for formal checkpoint review;
- what the next recommendation is and why.

## Current Capability Summary

Growth already has substantial backend foundation:

- native graph import, graph plan, graph binding, graph options, and
  domain-pack/subject provenance;
- target/domain-pack provisioning;
- Gateway-only planner, authoring, and evaluation boundaries;
- `daily_score_once` learner flow for generated daily cards;
- formal stage-assessment backend with higher-weight evidence and cooldown;
- evidence ledger, evidence audit, Profile V2, profile-delta audit, Owner
  correction, cycle audit, and audit-completeness readback;
- plan draft, validation, audit, and publish bridge;
- Owner daily-loop backend facade for preview, draft, and publish;
- Owner audit/correction smoke CLI for read-only cycle audit/completeness/
  correction readback and explicit `--allow-write` correction recording through
  the normal service graph;
- Fanfan science vertical and non-sample provisioned vertical harnesses;
- supervised automation proposal, scheduler dry-run, digest, failure policy,
  action handoff, Owner-explicit execution, scheduler run, reviewed worker
  target, default-disabled worker lease, and release-readiness evidence
  backend slices.

The product is not complete because the browser and release evidence are not
closed:

- Owner planner/provision UI is not fully product-closed;
- Owner audit/correction UI is not fully rendered from the implemented DTOs,
  even though the backend services and `npm run smoke:owner-audit` are
  available;
- stage-checkpoint UI remains separate future work;
- proposal/digest/action/execution/run/worker-target UI remains future work;
- platform Action Inbox/Web Push evidence is not complete;
- central embedded-plugin visual evidence is required for mobile, dark mode,
  visible progress, and embedded shell;
- production planner readiness smoke and production dry-run evidence are still
  required before release;
- background writeful scheduling remains blocked.

## Current Execution Decision

The next product direction is Path A unless an explicit backend-only evidence
task is selected. The reason is dependency order: Growth already has many
backend loop services, but the loop is not product-complete until Owner can
operate and audit it from the embedded plugin.

The next implementation slices should be:

1. **Owner daily loop closure**: complete the `生成` tab over the existing
   daily-loop and plan-publish facades so Owner can create one Fanfan science
   daily card without Codex. The UI must show selected target, provisioning,
   graph options, Profile V2, planner/author/evaluator readiness, draft
   progress, publish progress, card link/open state, and bounded errors.
2. **Learner daily evidence closure**: keep generated daily cards on one
   active submission box, one evaluation, one optional reflection, audio
   record/playback, and score-proportional completion. No pass-line retry loop
   may be added for ordinary daily practice.
3. **Owner audit/correction closure**: render cycle audit, evidence audit,
   profile-delta audit, correction history, audit completeness, and next
   recommendation after completion. Corrections must write through the Owner
   correction service and become additive evidence.
4. **Formal checkpoint separation**: expose readiness and activation for
   stage assessments as a separate Owner path. Daily plan publish must still
   block direct formal assessment publication.
5. **Generalized target closure**: extend the browser flow from the Fanfan
   sample to any visible and explicitly provisioned learner/domain pack while
   preserving actor/target workspace separation.

Release-readiness, scheduler run, worker target, and worker lease backends can
continue to collect evidence, but they remain secondary to the product-visible
loop. They must not change runtime config, call Gateway, publish cards,
evaluate submissions, activate stage assessments, or mutate learner state.

## Next Architecture Optimization Target

The next architecture optimization is to close the product loop over the
existing service facades, not to add another autonomous backend lane.

Current backend slices already cover most deterministic service boundaries:
graph import, provisioning, planner draft, card authoring, one-shot evaluation,
evidence ledger, Profile V2, profile delta, cycle audit, completeness,
proposal, dry-run, digest, failure policy, action handoff, default-disabled
execution, default-disabled scheduler run, worker target, worker lease, and
release-readiness evidence.

The missing product capability is the browser-operable learning loop:

| Slice | Objective | Required boundary | Non-goal |
| --- | --- | --- | --- |
| A1: Owner daily planning UI | Owner can create one Fanfan science daily card from persisted context. | Use `learning-daily-loop-service` preview/draft/publish; render readiness, plan item, progress, errors, and card link. | No direct Gateway calls, no new scheduler, no automatic publish. |
| A2: Learner daily evidence UI | Learner can finish the generated card with one submit, one evaluation, and one optional reflection. | Reuse generated-card detail flow, audio evidence, one-box-per-stage state, and visible failed-evaluation recovery. | No pass-line retry gate and no extra competing submission boxes. |
| A3: Owner audit/correction UI | Owner can see why the card happened, what changed, and how to correct future profile evidence. | Render plan/evidence/profile-delta/cycle/completeness/correction DTOs and write corrections through `learning-owner-correction-service`. | No browser-side Profile V2 computation and no raw transcript/prompt viewer. |
| A4: Stage checkpoint controls | Owner can see and activate formal checkpoint readiness separately. | Use `learning-stage-assessment-service` for readiness, activation, completion, and cooldown. | No direct formal assessment publication from the daily plan publisher. |
| A5: Generalized target selector | The same workflow can target another visible and provisioned learner/domain. | Preserve actor/target separation and target-workspace-owned rows. | No fallback to Fanfan constants for non-sample targets. |

The preferred next package is A1 plus the minimum A2/A3 wiring needed to prove
one completed Fanfan daily cycle can be created, completed, and audited from
the embedded plugin without Codex.

Backend-only work remains valid only when it adds harness or release evidence
for an existing boundary. It must not be described as product closure unless
the matching browser flow and visual evidence exist.

## Non-Negotiable Boundaries

Every next-stage slice must preserve these boundaries:

- Service First: routes remain request/auth/visible-target glue. Learning
  policy, state transitions, validation, and persistence live in services and
  repositories.
- Gateway-only models: Growth may plan, author, and evaluate only through
  Gateway clients. No direct model vendor SDK or old Home AI Growth server
  internals may be called.
- Draft before write: model responses become validated drafts before plan,
  card, evaluation, profile, or automation records are written.
- Summary-only persistence: durable loop records, public DTOs, docs, logs, and
  screenshots must not include raw historical answers, full transcripts, raw
  prompts, raw model output, hidden answer keys, source-document bodies,
  private paths, credentials, cookies, tokens, or provider configuration.
- Low-pressure daily learning: daily cards use one submission, one evaluation,
  one optional reflection, completion after the first evaluation, and
  score-proportional reward without a pass-line retry gate.
- Formal checkpoint separation: stage assessments are higher-weight profile
  checkpoints and must activate only through `learning-stage-assessment-service`.
- Owner supervision: publication, formal activation, correction, proposal
  decisions, execution enablement, and scheduler release gates remain
  auditable Owner or release decisions.

## Next-Stage Implementation Choices

There are two valid next implementation paths. Choose one explicitly before
writing code.

### Path A: Product-Visible Loop Closure

This is the preferred product path because it makes the AI learning loop usable
without Codex.

Scope:

1. Finish the Owner `生成` tab over `learning-daily-loop-service`.
2. Render selected visible target, learner id, domain pack, domain, subject,
   horizon, available minutes, target provisioning, graph options, Profile V2,
   evidence audit, planner readiness, authoring readiness, evaluation
   readiness, and recent audit summaries.
3. Draft through `POST /api/v1/growth/daily-loop/draft`.
4. Preview one validated daily plan item with target nodes, role, difficulty,
   support level, evidence requirements, estimated minutes, rationale, and
   basis evidence ids.
5. Publish through `POST /api/v1/growth/daily-loop/publish`.
6. Show visible pending, success, blocked, and failure states. No generate,
   draft, publish, or audit refresh action may fail silently.
7. Preserve mobile scroll, dark-mode contrast, and embedded sizing.
8. After learner completion, refresh cycle audit, evidence audit,
   profile-delta audit, corrections, completeness, and next recommendation
   from service DTOs.

Required closure:

- focused service/route tests for touched backend boundaries;
- frontend adapter and embedded layout tests for progress, visible errors,
  mobile scroll, and dark-mode contrast;
- UI privacy tests for raw/private payload exclusion;
- central Home AI embedded-plugin visual harness before production release;
- docs update in this file and the relevant UI/interaction docs.

### Path B: Backend Release-Readiness Gate

This path is valid when the immediate goal is to make automation release
evidence explicit before adding more UI. It must remain read-only or
summary-snapshot-only and must not enable scheduling.

Use the Growth-owned release-readiness boundary:

- service: `learning-automation-release-readiness-service`;
- repository: `automation-release-readiness.js`;
- table: `learning_growth_automation_release_readiness`;
- read route: `GET /api/v1/growth/automation/release-readiness`;
- Owner snapshot routes:
  `GET /api/v1/growth/automation/release-readiness/snapshots` and
  `POST /api/v1/growth/automation/release-readiness/snapshots`;
- smoke/snapshot CLI:
  `npm run smoke:release-readiness -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- scheduler dry-run smoke CLI:
  `npm run smoke:scheduler-dry-run -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- digest smoke CLI:
  `npm run smoke:digest -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- failure policy smoke CLI:
  `npm run smoke:failure-policy -- --workspace-id <workspace> --learner-id <learner> --domain <domain> --subject <subject> --json`.
- action handoff smoke CLI:
  `npm run smoke:action-handoff -- --workspace-id <workspace> --learner-id <learner> --json`.
- scheduler execution smoke CLI:
  `npm run smoke:scheduler-execution -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is read-only list. `execute` requires explicit
  `--allow-write` and remains blocked unless
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`.
- scheduler run smoke CLI:
  `npm run smoke:scheduler-run -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is read-only list. `run` requires explicit
  `--allow-write` and remains blocked unless
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=true`.
- scheduler worker target smoke CLI:
  `npm run smoke:scheduler-worker-target -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is read-only list. `runnable` is read-only.
  `create` and `review` require explicit `--allow-write` and still keep
  `productionSchedulingAllowed=false`.
- scheduler worker smoke CLI:
  `npm run smoke:scheduler-worker -- --workspace-id <workspace> --learner-id <learner> --json`.
  The default operation is disabled no-write status. Enabled `tick` /
  `tick-targets` require explicit `--allow-write`; with the scheduler gate
  still disabled, write-gated evidence records a blocked lease/run rather than
  publishing.

The service aggregates summary-only readiness evidence:

- Owner daily UI product/visual evidence;
- Owner audit/correction UI evidence;
- stage-checkpoint separation evidence;
- proposal review UI evidence;
- automation digest UI evidence;
- automation action handoff UI evidence;
- scheduler execution UI evidence;
- scheduler run UI evidence;
- scheduler worker-target UI evidence;
- reviewed automation digest evidence;
- active failure-policy readiness;
- delivered action-handoff evidence;
- production action handoff smoke evidence from
  `npm run smoke:action-handoff` for scoped list/create/deliver checks;
- Growth-side scheduler execution smoke evidence from
  `npm run smoke:scheduler-execution` for scoped read-only list checks and
  default-disabled blocked execution checks when explicitly write-gated;
- Growth-side scheduler run smoke evidence from `npm run smoke:scheduler-run`
  for scoped read-only run list checks and default-disabled blocked run checks
  when explicitly write-gated;
- Owner-explicit execution gate status;
- scheduler run default-disabled status;
- Growth-side reviewed worker target smoke evidence from
  `npm run smoke:scheduler-worker-target` for scoped read-only list/runnable
  checks and explicit write-gated create/review checks;
- reviewed enabled worker targets for the exact learner/domain/horizon scope;
- worker lease/timer default-disabled status;
- production scheduler worker smoke evidence from
  `npm run smoke:scheduler-worker`;
- production planner readiness smoke result;
- production daily-loop preview smoke evidence from
  `npm run smoke:daily-loop-preview`;
- production controlled daily-loop draft/publish smoke evidence from
  `npm run smoke:daily-loop -- --operation draft|publish --allow-write ...`;
- production scheduler dry-run evidence from
  `learning-automation-scheduler-service.dryRun` or
  `npm run smoke:scheduler-dry-run`;
- Home AI platform Action Inbox/Web Push evidence;
- central embedded-plugin visual evidence;
- explicit release approval for each config gate:
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED`,
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`, and
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED`.

The route and service must return bounded statuses such as `pass`, `missing`,
`blocked`, or `not_applicable`, plus stable evidence ids or timestamps. They
must not expose raw learner answers, raw model payloads, private paths,
credentials, provider configuration, or long logs.

Forbidden behavior:

- no Gateway calls;
- no plan drafting or publication;
- no card generation;
- no evaluation;
- no proposal execution recording;
- no scheduler execution;
- no scheduler run/tick;
- no Action Inbox/Web Push delivery;
- no stage-assessment activation;
- no learner-state mutation.

The snapshot table is an audit artifact, not a release switch. Even a
`ready_for_release_review` snapshot must not flip runtime config.

Readiness response contract:

| Field | Required meaning |
| --- | --- |
| `status` | `ready_for_release_review`, `blocked`, or `incomplete`. |
| `checks[]` | Stable check keys with `pass`, `missing`, `blocked`, or `not_applicable`, bounded summary, and optional required action. |
| `evidence` | Summary-only list of external evidence keys supplied by Owner or platform evidence collection. |
| `config` | Current automation config booleans plus `writefulSchedulingAllowed=false`. |
| `summary.readyForOwnerLoop` | True only when Owner daily UI, Owner audit UI, and central visual evidence are present. |
| `summary.readyForReleaseReview` | True only when all required checks pass or are not applicable. |
| `releaseReview.advisoryOnly` | Always true in this boundary. |

Snapshot persistence contract:

- snapshots are summary-only release review artifacts;
- the CLI defaults to no-write readiness evaluation; it writes only when
  `--write-snapshot` is explicitly supplied;
- CLI-supplied evidence must be structured summary evidence through
  `--evidence-json`, `--release-approval-json`, or bounded evidence flags,
  and it is rejected by the service if privacy-risk keys are present;
- release approval inputs may be supplied through `releaseApproval`,
  `approvals`, top-level approval fields, or CLI flags such as
  `--writeful-execution-approval`, `--background-scheduler-approval`, and
  `--background-worker-approval`; the readiness service still keeps
  `writefulSchedulingAllowed=false` and treats approval as review evidence,
  not as a runtime switch;
- idempotency is based on scope, status, timestamp, and check keys;
- privacy-risk keys and non-`summary_only` privacy class are rejected;
- routes enforce Owner-only writes, workspace bearer authorization, and
  visible-target scoping;
- list/read responses return public DTOs, not raw SQLite rows.

Required closure:

- repository tests for migration, idempotent snapshot persistence, privacy
  class, and privacy-risk key rejection;
- service tests for each prerequisite, dependency failure, disabled config,
  missing evidence, and all-pass snapshot status;
- route tests for Owner/workspace authorization and visible-target scoping;
- architecture guard proving no forbidden Gateway/publication/evaluation/
  scheduler/stage-assessment calls;
- docs-locality checks and broad local gate.

## Release Readiness Semantics

Release readiness has three different meanings and must not be collapsed into
one boolean.

| Term | Meaning | Can it publish cards? |
| --- | --- | --- |
| `readyForOwnerLoop` | Owner can manually draft and publish one daily card from the UI with visible progress and audit refresh. | Only through explicit Owner publish. |
| `readyForReleaseReview` | Product, platform, visual, production dry-run, and harness evidence are present for review. | No. It is evidence for a human release decision. |
| `writefulSchedulingAllowed` | Runtime config and explicit release approval allow controlled execution through the documented gates. | Only through the execution service, never directly from readiness. |

A release-readiness service may compute the first two. It must always keep
`writefulSchedulingAllowed=false` unless a later dedicated release-management
boundary is designed and approved. Today, readiness evidence is advisory.

## Fanfan Science Daily Playbook

The first complete browser path should prove this sample:

- actor: Owner;
- target learner workspace: Fanfan target returned by Growth view targets;
- learner id: `fanfan`;
- domain pack: UK/HK curriculum foundation;
- domain: `science`;
- subject: `science`;
- horizon: `daily_plan`;
- available minutes: `15`;
- card family: daily practice;
- completion policy: `daily_score_once`.

Expected steps:

1. Owner opens Growth and selects `生成`.
2. UI loads preview/context for the selected target and scope.
3. UI shows provisioning, graph options, Profile V2, evidence/audit summaries,
   and model boundary readiness.
4. Owner drafts a plan.
5. Owner reviews one validated daily item.
6. Owner explicitly publishes.
7. Learner completes one submission, one evaluation, and one optional
   reflection.
8. Owner refreshes audit and sees what changed, what stayed uncertain, and
   what the next recommendation is.

This playbook is successful even when the learner score is low. A low score
becomes future planning evidence, not a required retry loop.

## Harness Matrix

| Boundary | Required harness |
| --- | --- |
| Planner/author/evaluator Gateway clients | Fake valid stream, valid JSON, empty output, invalid JSON, timeout, repair failure, and privacy-risk output. |
| Daily loop service | Preview, draft, publish, failed publish, audit refresh, `tests/growth-daily-loop-preview-smoke-script.test.js`, `tests/growth-daily-loop-smoke-script.test.js`, `npm run smoke:daily-loop-preview`, controlled `npm run smoke:daily-loop` with explicit `--allow-write` for draft/publish, and no direct Gateway/card-generation calls from routes or the CLI. |
| Learner daily interaction | One submission box, one evaluation, one optional reflection, audio record/playback, visible failed-evaluation retry path, and no pass-line loop. |
| Evidence/profile/audit | Evidence ledger, Profile V2, profile-delta audit, correction, cycle audit, completeness, stale evidence, privacy tests, `tests/growth-owner-audit-smoke-script.test.js`, and `npm run smoke:owner-audit`. |
| Stage assessment | Readiness, activation, coverage, completion, cooldown, and direct daily-publish blocking. |
| Multi-workspace target | Visible-target allow/deny, explicit provision enablement, wrong-subject blocking, target-workspace row ownership, and no actor/target mixing. |
| Scheduler dry-run | Service tests, `tests/growth-scheduler-dry-run-smoke-script.test.js`, `npm run smoke:scheduler-dry-run`, and architecture guard for no Gateway, publication, evaluation, execution, scheduler tick, stage activation, notification, learner-state mutation, or direct repository access from the CLI. |
| Digest | Repository/service/route tests, `tests/growth-automation-digest-smoke-script.test.js`, `npm run smoke:digest`, read-only list/get by default, explicit `--allow-write` for create/review, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Failure policy | Repository/service/route tests, `tests/growth-automation-failure-policy-smoke-script.test.js`, `npm run smoke:failure-policy`, read-only readiness/list by default, explicit `--allow-write` for create/review, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, action handoff, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Action handoff | Repository/service/route tests, `tests/growth-automation-action-handoff-smoke-script.test.js`, `npm run smoke:action-handoff`, explicit write gate for create/deliver, event delivery failure visibility, and architecture guard for no Gateway, publication, evaluation, scheduler execution, scheduler tick, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler execution | Repository/service/route tests, `tests/growth-automation-scheduler-execution-smoke-script.test.js`, `npm run smoke:scheduler-execution`, read-only list by default, explicit `--allow-write` for execute, default-disabled blocked execution evidence, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler tick, action handoff delivery, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler run | Repository/service/route tests, `tests/growth-automation-scheduler-run-smoke-script.test.js`, `npm run smoke:scheduler-run`, read-only list by default, explicit `--allow-write` for run, default-disabled blocked run evidence, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler execution bypass, action handoff delivery, worker timer, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler worker target | Repository/service/route tests, `tests/growth-automation-scheduler-worker-target-smoke-script.test.js`, `npm run smoke:scheduler-worker-target`, read-only list/runnable operations by default, explicit `--allow-write` for create/review, target provisioning plus Owner review evidence, `productionSchedulingAllowed=false`, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler run/execution bypass, action handoff delivery, worker timer, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Scheduler worker | Worker service/lease repository/run service tests, `tests/growth-automation-scheduler-worker-smoke-script.test.js`, `npm run smoke:scheduler-worker`, disabled no-write status by default, explicit `--allow-write` for enabled tick/tick-targets, blocked lease/run evidence while scheduler run remains disabled, and architecture guard for no Gateway, direct publication, evaluation, scheduler dry-run bypass, scheduler run/execution bypass, action handoff delivery, worker-target service bypass, stage activation, learner-state mutation, or direct repository access from the CLI. |
| Release readiness | Snapshot repository/service/route tests, `tests/growth-release-readiness-smoke-script.test.js`, `npm run smoke:release-readiness`, automation digest/action handoff/execution/run/worker-target UI evidence, production action handoff smoke evidence, production scheduler execution smoke evidence, production scheduler run smoke evidence, production scheduler worker target smoke evidence, production scheduler worker smoke evidence, production planner readiness smoke evidence from `npm run smoke:planner-readiness`, production daily-loop preview smoke evidence, production controlled daily-loop write-smoke evidence, scheduler dry-run evidence, and architecture guard for no Gateway, publication, evaluation, scheduler, notification delivery, stage, or learner-state mutation from the release-readiness boundary. |
| UI | Progress state, visible errors, mobile scroll, dark-mode contrast, embedded sizing, and no hidden final action controls. |
| Docs | `node scripts/check-growth-docs-locality.js` and `node --test tests/growth-docs-locality.test.js`. |
| Broad local gate | `npm run check`, `npm test`, and `git diff --check` before commit/deploy. `scripts/check-growth-syntax-coverage.js` and `tests/growth-architecture-boundary.test.js` must keep `npm run check` covering every runtime JavaScript file under `scripts/`, `src/`, and `public/`. |
| Production UI release | Central Home AI embedded-plugin visual harness and AI Ops evidence ledger. |

## Definition Of Done

A next-stage package is complete only when:

- the owning Growth-local document is updated;
- service, repository, route, UI, architecture, privacy, and visual harnesses
  match the touched boundary;
- public DTOs remain summary-only;
- raw learner content, raw prompts, raw model output, private paths, and
  credentials are absent from docs, logs, screenshots, persistent rows, and
  public API responses;
- focused tests pass;
- docs-locality checks pass;
- broad local validation passes before commit/deploy;
- central visual evidence exists before production UI release;
- `.agent-context/HANDOFF.md` records current state and remaining gates.

## Immediate Recommendation

The preferred next product slice is Path A: close the Owner-supervised daily
browser loop for one Fanfan science card over the existing daily-loop facade.
That makes the AI loop observable and avoids adding automation before Owner can
inspect why a card was selected and what changed after completion.

If the next slice must be backend-only, choose Path B and keep it strictly as
release-readiness evidence. That boundary should make missing release evidence
explicit, but it must not enable execution or scheduling.
