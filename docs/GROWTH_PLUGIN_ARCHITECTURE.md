# Growth Plugin Architecture

Last updated: 2026-06-15.

This document records Growth-local architecture boundaries. Platform rules stay
in the canonical Home AI contract docs referenced by
`docs/HOME_AI_PLATFORM_CONTRACT.md`.

## Architecture Goal

Growth should stay a service-first embedded plugin:

- Home AI owns embedding, same-origin proxying, workspace grants, platform
  workflows, and shared visual/deployment tooling.
- The Growth plugin owns Growth-domain data projections, learner evidence
  writes, evaluation queue processing, Growth learning-coin settlement, audio
  playback, and plugin-local UI behavior.
- Runtime behavior must be extracted through documented API/service boundaries,
  not by copying Home AI server composition into this workspace.

The next target architecture is the AI-guided learning operating loop defined
in `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`, constrained by
`docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`, described in
`docs/GROWTH_LEARNING_OPERATING_LOOP.md`, executed through
`docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`, detailed in
`docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`, sequenced in
`docs/GROWTH_AI_LEARNING_ROADMAP.md`, and narrowed for immediate execution in
`docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`. Scheduling-adjacent work must
also read
`docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` before adding digest,
notification, Action Inbox, rollback, or writeful scheduler behavior. The
roadmap is also the durable product plan for the capability model, scientific
learning policy, Owner operating modes, release gates, and
documentation/harness contract. That target extends the existing card-level
loop with a first-class evidence ledger, Profile V2 projection,
Gateway-backed planner, post-evaluation profile-delta audit, Owner audit
surface, and a generalized subject/workspace parameter model. The route layer
should continue to remain glue while those decisions move into dedicated
services.

## Platform Contract Fit

Current Growth architecture fits the Home AI platform contract in the core
backend boundaries:

- Service First: planner, authoring, evaluation, evidence ledger, Profile V2,
  stage assessment, card generation, reward settlement, and signal writes are
  owned by services. `growth-routes.js` should remain request parsing,
  authorization, dependency dispatch, and response formatting.
- Modular: SQLite behavior is split into repositories for evidence writes,
  evaluation jobs, rewards, graph data, card authoring publish, stage cycles,
  evidence ledger, and learning plan drafts. The store facade remains the
  public composition boundary while modules continue to be extracted by feature
  need.
- Gateway-only model boundary: Growth calls models only through Gateway
  clients. It must not import Home AI old Growth server internals or direct
  vendor SDKs.
- Extensible: learner workspace, learner id, subject, graph/domain pack,
  planner horizon, card role, pressure policy, and Gateway readiness are
  service parameters rather than hard-coded browser assumptions.
- Provisioned: view-target visibility is not treated as permission to generate
  every subject. `learning-target-provisioning-service` owns the separate
  learner/domain-pack/subject provision policy before planner draft, plan
  publish, and direct generation.
- Auditable: plan drafts, graph bindings, evidence ledger rows, evaluations,
  profile deltas, trajectory recommendations, and stage cycles create bounded
  ids that can be projected to Owner without raw learner content.
- Evidence-fresh: Profile V2 differentiates stale daily evidence from
  longer-lived formal stage-assessment evidence. Owner corrections are
  auditable state adjustments, but they do not refresh learner evidence
  recency. Stale strengths become low-pressure review hints instead of stretch
  claims.
- Stage-safe: planner stage-checkpoint drafts are suggestions only. Publishing
  a formal `stage_assessment` card remains blocked at
  `learning-plan-publisher-service` and must go through
  `learning-stage-assessment-service`.
- Scheduler-safe: background scheduler worker targets are not production
  policy until they are persisted and Owner-reviewed through
  `learning-automation-scheduler-worker-target-service`. Environment JSON
  target lists are local fallback only.
- Release-evidence-safe: release readiness is an evidence aggregate, not an
  execution switch. `learning-automation-release-readiness-service`
  summarizes product, platform, visual, daily-loop write-smoke, dry-run,
  reviewed-target, config, and approval evidence, but it must not call Gateway,
  daily-loop services, publish, evaluate, schedule, activate stage assessments,
  deliver notifications, or mutate learner state.

Known gaps before the architecture can be called production-complete for the
full operating loop:

- embedded Owner UI for plan draft preview and explicit publish is still
  pending;
- no-write planner Gateway readiness smoke is implemented locally; production
  execution against real Gateway config is pending before planner UI deploy;
- no-write daily-loop preview smoke CLI is implemented locally through
  `npm run smoke:daily-loop-preview`; it delegates to
  `learning-daily-loop-service.preview` through the normal service graph and
  does not draft, publish, call Gateway, schedule, notify, activate stage
  assessments, or write SQLite;
- controlled daily-loop smoke CLI is implemented locally through
  `npm run smoke:daily-loop`; it defaults to no-write preview, requires
  explicit `--allow-write` for `draft` and `publish`, requires
  `--plan-draft-id` for publish, and still delegates only through
  `learning-daily-loop-service`;
- Owner audit/correction smoke CLI is implemented locally through
  `npm run smoke:owner-audit`; it defaults to read-only audit over
  `learning-cycle-audit-service`,
  `learning-audit-completeness-service`, and
  `learning-owner-correction-service`, and requires explicit
  `--allow-write` before recording a correction through
  `learning-owner-correction-service.recordCorrection`;
- no-write release-readiness smoke/snapshot CLI is implemented locally through
  `npm run smoke:release-readiness`; production evidence collection still
  requires explicit Owner/platform/visual evidence and `--write-snapshot` only
  records a summary-only advisory snapshot;
- read-only scheduler dry-run smoke CLI is implemented locally through
  `npm run smoke:scheduler-dry-run`; it delegates to
  `learning-automation-scheduler-service.dryRun`, defaults to no-write
  candidate inspection, and provides a structured production dry-run evidence
  entry without publishing, executing, calling Gateway, or opening repository
  internals from the script;
- Owner-safe Profile V2 and evidence-ledger audit projections are available in
  the backend/API generation context, and evidence-ledger audit readback is
  available through `GET /api/v1/growth/evidence/audit`;
  post-evaluation `profile_delta` is now returned from evaluation processing
  and persisted in
  `learning_growth_profile_delta_audits`, with bounded readback through
  `GET /api/v1/growth/profile-delta-audits`; the backend also exposes
  `GET /api/v1/growth/learning-cycles/audit` as a single service-owned
  aggregate over plan, evidence, profile-delta, and correction readbacks, but
  the embedded UI does not yet render the full audit surface;
- domain-pack/subject selection beyond the Fanfan sample now has a backend
  provisioning policy, bounded `graphOptions`, graph-plan/card audit
  `domainPackId` propagation, and a non-sample provisioned vertical service
  harness, but the embedded UI does not yet expose provision review/create
  controls or a provisioned selector;
- visual harness coverage is required before shipping the new planner UI.

## Architecture Optimization Backlog

The next architecture work should optimize the learning loop, not add
unbounded automation. Priority order:

1. Owner-supervised daily UI closure:
   - backend facade is implemented through `learning-daily-loop-service` and
     Owner-only daily-loop preview/draft/publish routes;
   - keep the `生成` tab as UI glue over existing service routes;
   - render target provisioning, graph options, Profile V2, evidence audit,
     planner readiness, authoring readiness, evaluation readiness, plan
     preview, publish progress, publish-attempt failures, and generated-card
     preview from bounded DTOs;
   - avoid browser-side prompt assembly, Gateway calls, direct repository
     reads, or profile-diff computation.
2. Audit and correction UI closure:
   - use `learning-cycle-audit-service`,
     `learning-audit-completeness-service`,
     `learning-profile-delta-audit-service`,
     `learning-owner-correction-service`, and Profile V2 read projections;
   - store Owner corrections as additive evidence through service boundaries;
   - keep raw learner content and raw model output out of audit DTOs.
3. Stage checkpoint UI closure:
   - expose readiness, coverage, cooldown, and Owner activation state through
     `learning-stage-assessment-service`;
   - keep direct formal publication blocked in
     `learning-plan-publisher-service`.
4. Multi-workspace/domain-pack closure:
   - require view-target visibility plus target provisioning before planning,
     generation, correction, or publication writes;
   - keep actor workspace and learner target workspace separate in every
     service input, repository write, route test, and UI state object.
5. Supervised proposal review UI:
   - render stored proposals, Owner decisions, accepted-only explicit publish
     actions, execution metadata, and failure state from
     `learning-automation-proposal-service`;
   - do not start scheduling from proposal creation or decision.
6. Scheduler dry-run:
   - read-only backend service and route are implemented locally;
   - `npm run smoke:scheduler-dry-run` is a service-owned CLI over the same
     `learning-automation-scheduler-service.dryRun` boundary for local or
     production dry-run evidence collection;
   - recheck audit completeness and target provisioning;
   - report candidate actions without Gateway calls, plan publication, card
     authoring, durable writes, notifications, or stage-assessment activation.
7. Automation digest gate:
   - `learning-automation-digest-service` and
     `learning_growth_automation_digests` persist summary-only dry-run review
     packets before any writeful scheduling;
   - digest creation/review must not publish, record proposal execution,
     notify, enqueue, call Gateway, or activate stage assessments;
   - rollback/failure policy backend is implemented through
     `learning-automation-failure-policy-service` and
     `learning_growth_automation_failure_policies`;
   - action handoff backend is implemented through
     `learning-automation-action-handoff-service` and
     `learning_growth_automation_action_handoffs`;
   - Owner-explicit scheduler execution backend is implemented through
     `learning-automation-scheduler-execution-service` and
     `learning_growth_automation_scheduler_executions`, but remains
     default-disabled and must not be treated as a background scheduler;
   - supervised scheduler run/tick and worker lease behavior are documented in
     `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`; its safe
     shape is a default-disabled `learning-automation-scheduler-run-service`
     over `learning_growth_automation_scheduler_runs`, an Owner-reviewed
     `learning-automation-scheduler-worker-target-service` over
     `learning_growth_automation_scheduler_worker_targets`, plus a separately
     default-disabled `learning-automation-scheduler-worker-service` over
     `learning_growth_automation_scheduler_worker_leases`. The worker uses
     enabled reviewed targets before local environment fallback, calls only the
     scheduler run service, and must not become a production background worker
     without separate release evidence;
   - keep production enablement, writeful workers, and full notification /
     Action Inbox UI as later slices after Owner UI, platform action evidence,
     visual evidence, and release approval.
8. Release-readiness evidence gate:
   - backend boundary:
     `learning-automation-release-readiness-service`,
     `automation-release-readiness.js`, and
     `learning_growth_automation_release_readiness`;
   - operational smoke/snapshot entry:
     `npm run smoke:release-readiness` delegates to the service, defaults to
     no-write evaluation, accepts only structured summary evidence/approval
     inputs, and writes a snapshot only with `--write-snapshot`;
   - aggregate only summary-only evidence for product UI, audit UI, proposal /
     digest / action / execution / run UI, active failure policy, delivered
     handoffs, reviewed enabled worker targets, production planner readiness,
     controlled daily-loop write smoke, production dry-run, central visual
     evidence, platform Action Inbox/Web Push evidence, and explicit
     release approval;
   - expose bounded readiness and snapshot routes without flipping runtime
     config or enabling scheduling;
   - keep this as release-review evidence only. It does not replace the
     product-visible Owner daily loop, platform Action Inbox/Web Push evidence,
     production dry-run evidence, central visual evidence, or explicit release
     approval.

Every item above needs focused harness updates before production use. UI items
also need the central Home AI embedded-plugin visual harness because mobile
scroll, dark-mode contrast, and visible progress are platform-level release
requirements.

## Check Gate Contract

`npm run check` is a backend syntax gate, not only a script smoke. It must
syntax-check every runtime JavaScript file under:

- `scripts/`;
- `src/`;
- `public/`.

`scripts/check-growth-syntax-coverage.js` reads `package.json` and the current
runtime file list, then fails when a runtime file is missing from the
`node --check` list, when a check entry is stale, or when a check entry is
duplicated. `tests/growth-architecture-boundary.test.js` also calls that
checker. Adding any new runtime JavaScript file without adding a matching
`node --check` entry is a Harness failure, even when the file has focused
service tests.

## Runtime Layers

| Layer | Files | Responsibility |
| --- | --- | --- |
| Composition root | `src/app/services.js` | Construct stores and services, wire dependencies, and expose one service graph to routes. |
| HTTP server | `src/app/http-server.js` | Loopback service listener, route dispatch, optional evaluation worker timer, and optional default-disabled scheduler worker timer. |
| Operational smoke scripts | `scripts/smoke-growth-planner-readiness.js`, `scripts/smoke-growth-daily-loop-preview.js`, `scripts/smoke-growth-daily-loop.js`, `scripts/smoke-growth-owner-audit.js`, `scripts/smoke-growth-release-readiness.js`, `scripts/smoke-growth-scheduler-dry-run.js` | CLI-only evidence collectors that instantiate the normal service graph and delegate to service boundaries. Planner readiness is no-write. Daily-loop preview is no-write and calls only `learningDailyLoopService.preview`. Controlled daily-loop smoke defaults to preview and requires explicit `--allow-write` for draft/publish evidence through `learningDailyLoopService`; publish additionally requires `--plan-draft-id`. Owner audit defaults to read-only cycle audit, completeness, and correction readback; its correction operation requires explicit `--allow-write` and delegates only to `learningOwnerCorrectionService.recordCorrection` before refreshing audit DTOs. Scheduler dry-run is no-write and calls only `learningAutomationSchedulerService.dryRun`. Release readiness is no-write by default and writes only an explicit summary-only snapshot with `--write-snapshot`. Scripts must not import SQLite repositories directly, call Gateway directly, call plan-publisher/card-generation/evaluation directly, execute scheduler actions, run scheduler ticks, deliver notifications, or activate stage assessments. |
| Plugin platform routes | `src/routes/plugin-routes.js` | Manifest, workspace provisioning, and launch-token endpoints. |
| Growth API routes | `src/routes/growth-routes.js` | HTTP parsing, bounded body limits, workspace/registration authorization, and service dispatch. |
| Growth orchestration service | `src/services/growth-service.js` | Read/write orchestration across facade, snapshot, and plugin-owned SQLite providers. |
| Growth read orchestrator | `src/services/growth-read-orchestrator.js` | Explicit provider fallback order for status, board, card, and migration readback. |
| Growth write orchestrator | `src/services/growth-write-orchestrator.js` | Explicit plugin-owned command boundary for learner evidence, reflection, and Growth learning-coin writes. |
| Growth read providers | `src/services/growth-providers/*.js` | Source-specific Home AI facade, plugin SQLite, and snapshot projections. |
| Growth write providers | `src/services/growth-providers/sqlite-write-provider.js` | Source-specific plugin SQLite command adapter for evidence, reflection, and Growth learning-coin writes. |
| Growth service models | `src/services/growth-service-models.js` | Pure bounded status, board, snapshot, card, and migration summary projections used by the orchestration service. |
| Home AI facade client | `src/services/home-ai-growth-facade-client.js` | Bounded Home AI Growth facade HTTP client with base URL normalization and workspace query/header handling. |
| Card generation service | `src/services/learning-card-generation-service.js` | Graph-plus-history card generation orchestration. It normalizes recipe policy, enforces target provisioning when injected, creates a graph plan with domain-pack/domain/subject provenance, reads historical summaries, adds graph source summaries, calls authoring, returns the published card result, and marks consumed trajectory recommendations accepted after publish. |
| Card generation recipe policy service | `src/services/learning-card-generation-recipe-policy-service.js` | Service-owned recipe catalog and defaults for generated cards. V1 owns `daily_english_v1`, English domain/subject defaults, card schema version, and `daily_score_once` policy so the Owner UI can submit a compact recipe request without graph-policy internals. |
| Card generation context service | `src/services/learning-card-generation-context-service.js` | Owner UI read-context service for card generation and operating-loop readiness. It returns Fanfan sample eligibility, recipe-policy metadata, graph readiness, `graphOptions` domain-pack/subject choices, suggested graph target, explicit next-card recommendation/rationale, bounded history counts, Owner-safe Profile V2, evidence audit rows, `ownerAudit` readback over plan-audit, persisted profile-delta, and Owner correction DTOs, planner readiness, planner context preview including read-only stage-assessment readiness, separate planner/authoring/evaluation Gateway readiness, and the `daily_score_once` policy without exposing raw learner content. |
| Learning daily-loop service | `src/services/learning-daily-loop-service.js` | Owner-supervised daily-loop backend facade. It composes card-generation context, plan publisher, cycle audit, and audit-completeness services into bounded preview/draft/publish DTOs for UI and harness use. It strips generated authoring draft internals from publish responses and does not call Gateway directly, card generation directly, SQLite tables, notifications, Action Inbox, stage-assessment activation, or scheduling. It backs Owner-only `GET /api/v1/growth/daily-loop/preview`, `POST /api/v1/growth/daily-loop/draft`, `POST /api/v1/growth/daily-loop/publish`, the no-write `npm run smoke:daily-loop-preview` CLI, and the controlled `npm run smoke:daily-loop` CLI whose draft/publish operations require `--allow-write`. |
| Card recommendation service | `src/services/learning-card-recommendation-service.js` | Summary-only next-card recommendation projection. It promotes the latest pending persisted trajectory `nextRecommendation`, skips consumed statuses, falls back to recomputed profile strategy, and delegates accepted-status writes to the mastery-profile repository. |
| Card next-target service | `src/services/learning-card-next-target-service.js` | Summary-only selector for the default next graph target. It uses the selected learner profile projection and next-card strategy target nodes before falling back to graph suggestions, carries selected recommendation lifecycle metadata, and delegates accepted-status writes after generation publishes. |
| Card authoring service | `src/services/learning-card-authoring-service.js` | Growth-owned card authoring orchestration. It assembles summary-only graph/mastery/experience input, calls Gateway, runs validation/repair policy, and delegates accepted drafts to an injected publisher. |
| Gateway authoring client | `src/services/growth-gateway-authoring-client.js` | Gateway-only model boundary for card authoring. It supports SSE and JSON Gateway responses and does not call model vendors directly. |
| Card authoring validation | `src/services/learning-card-authoring-validation-service.js` | Authoring draft validator for JSON parsing, `teachingFlow`, role policy, graph binding consistency, privacy, and bounded-content checks. |
| Card evaluation service | `src/services/learning-card-evaluation-service.js` | Growth-owned Gateway evaluation orchestration. It assembles bounded authenticated evaluation input, parses Gateway output as an evaluation draft, validates schema/graph/privacy policy, and returns the same evaluator DTO consumed by `growth-evaluation-service`. |
| Gateway evaluation client | `src/services/growth-gateway-evaluation-client.js` | Gateway-only model boundary for card evaluation. It supports fake harness `{ kind, input }`, official Gateway `/v1/responses`, SSE, JSON, timeout handling, and no direct model-vendor calls. |
| Evaluation owner review service | `src/services/learning-evaluation-owner-review-service.js` | Owner-only recovery orchestration for terminal failed evaluation jobs. It validates the target, delegates requeue to the SQLite evaluation-job repository, returns bounded retry status, and never calls Gateway or stores raw learner content. |
| Mastery profile service | `src/services/learning-mastery-profile-service.js` | Summary-only evaluation-to-profile updater. It derives bounded evidence, updates `learning_growth_mastery_states`, records safe experience signals, and rejects raw learner/private content in durable profile rows. |
| Card trajectory service | `src/services/learning-card-trajectory-service.js` | Idempotent trajectory writer for evaluated cards. It records strategy, graph targets, strengths, remaining weaknesses, mastery changes, and a pending next recommendation in `learning_growth_card_trajectories`, and supersedes older pending recommendations for the same learner/program. |
| Evidence ledger service | `src/services/learning-evidence-ledger-service.js` | Summary-only evidence ledger writer for daily evaluations, formal stage assessments, reflections, and learner experience signals. It writes `learning_growth_evidence_ledger`, rejects privacy-risk fields, and is called after evaluation/profile persistence. |
| Evidence audit service | `src/services/learning-evidence-audit-service.js` | Read service for public evidence-ledger audit DTOs. It supports workspace/learner/program/evidence/source/card/status/target-node filters, clamps limits, strips raw/private summary fields, and backs `GET /api/v1/growth/evidence/audit` without exposing `learning_growth_evidence_ledger` table details to routes or browser code. |
| Learning cycle audit service | `src/services/learning-cycle-audit-service.js` | Read aggregation service for one card/evaluation/plan learning cycle. It composes plan, evidence, profile-delta, and Owner-correction public readbacks, includes bounded plan publish-attempt events, produces bounded counts and a timeline, surfaces partial downstream failures, and backs `GET /api/v1/growth/learning-cycles/audit` without route-level SQLite table access. |
| Learning audit completeness service | `src/services/learning-audit-completeness-service.js` | Read-only policy service over the public cycle-audit DTO. It reports required audit findings, missing evidence, partial downstream failures, privacy projection status, and `readyForAutomation` without reading SQLite tables, writing durable state, calling Gateway, or starting a scheduler. It backs `GET /api/v1/growth/learning-cycles/completeness`. |
| Learning automation proposal service | `src/services/learning-automation-proposal-service.js` | Owner-reviewed proposal service for the first supervised automation layer. It requires a previous source-cycle id, checks audit completeness before any planner draft call, checks target provisioning, drafts a validated plan through `learning-plan-publisher-service.draftPlan`, stores summary-only proposal metadata, and returns an explicit Owner publish action without calling Gateway directly, card generation, stage-assessment activation, or scheduling. It records Owner decisions (`accepted`, `skipped`, `expired`, `superseded`) without publishing cards. It can explicitly publish only an accepted proposal through `learning-plan-publisher-service.publishPlanItem`, then records bounded execution metadata. It backs `GET`/`POST /api/v1/growth/automation/proposals`, `POST /api/v1/growth/automation/proposals/:proposalId/decision`, and `POST /api/v1/growth/automation/proposals/:proposalId/publish`. |
| Learning automation scheduler service | `src/services/learning-automation-scheduler-service.js` | Read-only supervised scheduling dry-run service. It lists accepted proposals through the proposal service, skips already-published executions, rechecks source-cycle audit completeness, rechecks target provisioning, and returns bounded `would_publish`, `blocked_audit`, `blocked_provisioning`, or skipped candidates. It backs Owner-only `POST /api/v1/growth/automation/scheduler/dry-run` and must not call Gateway, publish plans, generate cards, record proposal execution, send notifications, activate stage assessments, or inspect SQLite tables directly. |
| Learning automation digest service | `src/services/learning-automation-digest-service.js` | Owner-reviewed digest service for scheduler dry-run evidence. It calls only `learning-automation-scheduler-service.dryRun`, verifies non-writeful flags, stores summary-only candidates/blocked/required-action packets through the digest repository, and records bounded digest review metadata. It backs `GET`/`POST /api/v1/growth/automation/digests` and `POST /api/v1/growth/automation/digests/:digestId/review`. It must not call Gateway, publish plans, generate cards, record proposal execution, send notifications, enqueue workers, activate stage assessments, or inspect SQLite tables directly. |
| Learning automation failure policy service | `src/services/learning-automation-failure-policy-service.js` | Summary-only rollback/failure-policy service for scheduling readiness. It creates draft policies, activates/archives/supersedes them through bounded Owner review, and reports active policy readiness as a prerequisite only while keeping `writefulSchedulingAllowed=false`. It backs `GET`/`POST /api/v1/growth/automation/failure-policies`, `GET /api/v1/growth/automation/failure-policies/readiness`, and `POST /api/v1/growth/automation/failure-policies/:policyId/review`. It must not call Gateway, publish plans, generate cards, record proposal execution, call scheduler dry-run, send notifications, enqueue workers, activate stage assessments, or inspect SQLite tables directly. |
| Learning automation action handoff service | `src/services/learning-automation-action-handoff-service.js` | Summary-only handoff service between reviewed automation digests, active failure policy, and Home AI platform notification surfaces. It requires digest `status=reviewed`, checks active failure-policy readiness, stores bounded action/blocked metadata, emits `growth.automation.action_required` through `growth-event-service`, and records delivered or `delivery_failed` state. It backs `GET`/`POST /api/v1/growth/automation/action-handoffs` and `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`. It must not call Gateway, scheduler dry-run, publish plans, generate cards, record proposal execution, enqueue workers, activate stage assessments, or inspect SQLite tables directly. |
| Learning automation scheduler execution service | `src/services/learning-automation-scheduler-execution-service.js` | Default-disabled Owner-explicit execution service. It supports only `owner_explicit_once`, records bounded blocked state when `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED` is false, and when enabled rechecks delivered action handoff, reviewed digest, active failure-policy readiness, and read-only scheduler dry-run before delegating only to `learning-automation-proposal-service.publishAcceptedProposal`. It backs visible-target scoped execution list and Owner-only `POST /api/v1/growth/automation/scheduler/execute-once`. It must not call Gateway, direct plan publication, card generation, notifications, queues/workers, stage-assessment activation, or SQLite tables directly. |
| Learning automation scheduler run service | `src/services/learning-automation-scheduler-run-service.js` | Default-disabled supervised scheduler tick service. It records blocked/skipped/completed/partial/failed run state in `learning_growth_automation_scheduler_runs`, lists delivered action handoffs only when `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED` is true, converts bounded handoff actions into candidates, and delegates each candidate only to `learning-automation-scheduler-execution-service.executeOnce`. It backs visible-target scoped `GET /api/v1/growth/automation/scheduler/runs` and Owner-only `POST /api/v1/growth/automation/scheduler/run-once`. It must not call Gateway, direct plan publication, card generation, notifications, queues/workers, stage-assessment activation, or SQLite tables directly outside its repository. It is not production unattended scheduling. |
| Learning automation scheduler worker target service | `src/services/learning-automation-scheduler-worker-target-service.js` | Owner-reviewed persistent worker target configuration service. It creates `proposed` summary-only targets only after `learning-target-provisioning-service` passes, rechecks provisioning before enabling, lists only enabled runnable targets for the worker, and backs visible-target scoped `GET /api/v1/growth/automation/scheduler/worker-targets`, Owner-only `POST /api/v1/growth/automation/scheduler/worker-targets`, and Owner-only `POST /api/v1/growth/automation/scheduler/worker-targets/:targetId/review`. It must not call Gateway, scheduler run/execution, publication, card generation, notifications, stage assessment, or learner state repositories. |
| Learning automation scheduler worker service | `src/services/learning-automation-scheduler-worker-service.js` | Default-disabled timer/lease service over reviewed enabled worker targets, with environment JSON as local fallback only. It claims `learning_growth_automation_scheduler_worker_leases`, protects active leases, allows stale lease reclaim, and delegates only to `learning-automation-scheduler-run-service.runOnce`. It has no route and must not call Gateway, list handoffs, execute scheduler actions directly, publish plans, generate cards, notify, activate stage assessments, or read/write learner state directly. |
| Learning automation release-readiness service | `src/services/learning-automation-release-readiness-service.js` | Advisory release-review service. It aggregates summary-only evidence for Owner UI, audit UI, stage-checkpoint separation, proposal review, reviewed digest, active failure policy, delivered handoff, Owner-explicit execution gate, default-disabled scheduler/worker config, reviewed enabled worker targets, production planner readiness smoke, production controlled daily-loop write smoke, scheduler dry-run, platform Action Inbox/Web Push evidence, central visual evidence, and explicit release approvals. It backs visible-target scoped `GET /api/v1/growth/automation/release-readiness`, visible-target scoped snapshot listing, Owner-only snapshot creation, and the `npm run smoke:release-readiness` CLI. It must keep `writefulSchedulingAllowed=false` and must not call Gateway, daily-loop services, publish, evaluate, execute scheduler actions, run scheduler ticks, deliver notifications, activate stage assessments, or mutate learner state. |
| Profile V2 service | `src/services/learning-profile-v2-service.js` | Read projection over evidence ledger and optional legacy profile projection. It returns capability states, evidence weight totals, evidence-freshness metadata, stale-evidence summaries, strengths, weaknesses, misconceptions, pressure signals, and planner hints without treating unobserved nodes as weaknesses. Stale strengths route to low-pressure review instead of stretch. |
| Profile-delta service | `src/services/learning-profile-delta-service.js` | Post-evaluation audit projection over bounded Profile V2 before/after snapshots. It reports changed graph-node states, evidence-freshness changes, newly introduced or resolved stale reasons, evidence basis ids, planner hint changes, and visible non-fatal failures without exposing raw answers, transcripts, prompts, model output, source bodies, private paths, or provider config. |
| Profile-delta audit service | `src/services/learning-profile-delta-audit-service.js` | Read service for persisted public profile-delta audit DTOs. It enforces required workspace scope, clamps result limits, supports bounded filters, and keeps routes out of repository/table internals. |
| Profile-delta audit repository | `src/stores/growth-learning-sqlite/profile-delta-audits.js` | Persists bounded post-evaluation profile-delta DTOs in `learning_growth_profile_delta_audits` for Owner audit readback without browser-side raw profile diffs. |
| Automation scheduler worker lease repository | `src/stores/growth-learning-sqlite/automation-scheduler-worker-leases.js` | Persists summary-only worker lease claim/release state in `learning_growth_automation_scheduler_worker_leases`, rejects privacy-risk payload keys and non-summary privacy classes, protects active leases, and allows stale lease reclaim without exposing the internal lease nonce in public DTOs. |
| Automation scheduler worker target repository | `src/stores/growth-learning-sqlite/automation-scheduler-worker-targets.js` | Persists Owner-reviewed summary-only worker target configuration in `learning_growth_automation_scheduler_worker_targets`. It stores proposed/enabled/disabled/archived target state, readiness, policy, and review metadata; rejects privacy-risk payload keys and non-summary privacy classes; migrates bounded target/review columns; and returns public DTOs instead of raw table rows. |
| Automation release-readiness repository | `src/stores/growth-learning-sqlite/automation-release-readiness.js` | Persists summary-only release-readiness snapshots in `learning_growth_automation_release_readiness`. It stores bounded checks, evidence keys, config flags, summary, release-review metadata, status, scope, and creator metadata; rejects privacy-risk payload keys and non-summary privacy classes; supports idempotent stable ids and migration of bounded columns; and returns public DTOs instead of raw table rows. |
| Planner context service | `src/services/learning-planner-context-service.js` | Summary-only planner input assembler over graph candidate nodes, Profile V2 including stale-evidence summaries, recent evidence, read-only stage-assessment readiness, low-pressure constraints, and privacy flags. It consumes `learning-stage-assessment-service.stageReadiness()` and must not call writeful eligibility or activation paths from planner context reads. |
| Gateway planner client | `src/services/growth-gateway-planner-client.js` | Gateway-only model boundary for learning plan drafts. It supports fake harness transport and Gateway Responses-style payloads without direct model-vendor calls. |
| Plan validation and orchestrator | `src/services/learning-plan-validation-service.js`, `src/services/learning-plan-orchestrator-service.js` | Planner V1 draft boundary. The orchestrator calls Gateway, parses JSON, validates `growth.learningPlanDraft.v1`, and exposes a bounded no-write readiness smoke. Validation rejects high-pressure daily policy, weekly backlog pressure, weekly formal-assessment items, stage-checkpoint drafts without `learning-stage-assessment-service` activation policy, unknown graph nodes, invalid roles, invalid schema, and privacy-risk output before any plan can be persisted or published. |
| Plan publisher service | `src/services/learning-plan-publisher-service.js` | Stores validated summary-only plan drafts, returns Owner-safe preview DTOs, and publishes one selected non-formal plan item through `learning-card-generation-service`. It maps planner strategy roles into supported card-generation roles and marks the draft published only after card generation succeeds. It records bounded publish-attempt metadata for generation/provision/privacy failures and stage-assessment publish blocks while leaving the draft unpublished. It refuses direct publication for `stage_checkpoint_plan` / `stage_assessment` items with `stage_assessment_activation_required` so formal cards cannot bypass `learning-stage-assessment-service`. |
| Plan audit service | `src/services/learning-plan-audit-service.js` | Read service for public plan-draft and publication audit DTOs. It projects recent validated drafts, selected items, generated task-card ids, generated graph-plan ids, basis evidence ids, latest publish-attempt status/error/stage, timestamps, and bounded item reasons from the plan-draft repository for Owner context and `GET /api/v1/growth/learning-plans/audit` without exposing `learning_growth_plan_drafts` table details or raw planner payloads to routes or browser code. |
| Target provisioning service | `src/services/learning-target-provisioning-service.js` | Separates view-target visibility from learning-generation enablement. It resolves the selected learner's allowed domain pack/domain/subject, supports the Fanfan sample fallback, validates requested graph node ids against the provisioned graph context, and returns bounded `targetProvisioning` plus filtered `graphOptions` for context/planner/generation services. |
| Experience signal service | `src/services/learning-experience-signal-service.js` | Learner feedback writer for `too_easy`, `right_level`, `too_hard`, and `not_learned` signals. It validates graph target anchors, rejects raw/private fields, writes `sourceType=learner_feedback`, and returns summary-only signal DTOs. |
| Stage assessment service | `src/services/learning-stage-assessment-service.js` | Formal assessment readiness, eligibility, activation, and completion policy. `stageReadiness()` is read-only for planner/Owner context projections. `evaluateEligibility()` may record eligible/dormant/cooldown cycle state, and activation generates `stage_assessment` cards with cycle metadata only through this service. |
| Next-card strategy service | `src/services/learning-next-card-strategy-service.js` | Deterministic strategy selector over mastery summary, experience signals, and trajectory. It chooses repair/stabilize/transfer/stretch/integrate/review before card generation. |
| Learning profile projection service | `src/services/learning-profile-projection-service.js` | Owner/UI-safe read projection over mastery states, recent experience signals, recent card trajectory, and next-card strategy. It returns summary-only profile context for generation views without raw answers, transcripts, prompts, or source refs. |
| Owner correction service | `src/services/learning-owner-correction-service.js` | Owner-only backend service for profile audit corrections. It validates target provisioning, writes `owner_reviewed_correction` evidence through the evidence ledger, reads grouped correction DTOs, and lets Profile V2 absorb corrections without deleting historical evidence. `npm run smoke:owner-audit -- --operation correction --allow-write` is the service-owned operational write smoke and must not bypass this service. |
| Card authoring SQLite publisher | `src/stores/growth-learning-sqlite/card-authoring-publisher.js` | Transactional publisher for validated authoring drafts. It creates missing FK parent rows in `learning_programs` and `learning_plan_drafts`, upserts `learning_task_cards`, writes `learning_card_graph_bindings`, and rolls back on partial failure. |
| Learning plan draft repository | `src/stores/growth-learning-sqlite/learning-plan-drafts.js` | SQLite repository for `learning_growth_plan_drafts`. It stores summary-only planner drafts, context summaries, validation metadata, publication status, generated card linkage, and bounded latest publish-attempt metadata without mixing planner draft lifecycle into the older `learning_plan_drafts` parent table used by card authoring. |
| Learning automation proposal repository | `src/stores/growth-learning-sqlite/automation-proposals.js` | SQLite repository for `learning_growth_automation_proposals`. It persists summary-only Owner proposal metadata linking source cycle, new plan draft, selected item, target nodes, bounded rationale, Owner policy, bounded decision metadata, and bounded accepted-publish execution metadata. It supports idempotent stable ids, migrates decision/execution columns, rejects privacy-risk keys and non-summary privacy classes, rejects unaccepted proposal execution, and keeps routes out of table internals. |
| Learning automation digest repository | `src/stores/growth-learning-sqlite/automation-digests.js` | SQLite repository for `learning_growth_automation_digests`. It persists summary-only scheduler dry-run digest packets, blocked candidate summaries, required Owner actions, and bounded review metadata. It supports idempotent stable ids, migrates review columns, rejects privacy-risk keys and non-summary privacy classes, and returns public DTOs instead of raw table rows. |
| Learning automation failure policy repository | `src/stores/growth-learning-sqlite/automation-failure-policies.js` | SQLite repository for `learning_growth_automation_failure_policies`. It persists summary-only policy, rollback, failure, and Owner review metadata for future scheduling readiness. It supports idempotent stable ids, migrates review/policy-version columns, rejects privacy-risk keys and non-summary privacy classes, and returns public DTOs instead of raw table rows. |
| Learning automation action handoff repository | `src/stores/growth-learning-sqlite/automation-action-handoffs.js` | SQLite repository for `learning_growth_automation_action_handoffs`. It persists summary-only reviewed digest handoff records, active policy readiness metadata, bounded platform notification metadata, and delivered or visible failed delivery status. It supports idempotent stable ids, migrates delivery/readiness columns, rejects privacy-risk keys and non-summary privacy classes, and returns public DTOs instead of raw table rows. |
| Learning automation scheduler execution repository | `src/stores/growth-learning-sqlite/automation-scheduler-executions.js` | SQLite repository for `learning_growth_automation_scheduler_executions`. It persists summary-only Owner-explicit execution attempts, gate readback, delegated action metadata, bounded publish result, and blocked/failed/published status. It supports idempotent stable ids, migrates execution columns, rejects privacy-risk keys and non-summary privacy classes, and returns public DTOs instead of raw table rows. |
| Domain-pack provision repository | `src/stores/growth-learning-sqlite/domain-pack-provisions.js` | SQLite repository for `learning_growth_domain_pack_provisions`. It stores summary-only learner/domain-pack/subject provision policy, supports active provision lookup, and keeps raw graph/source/private payloads out of public provision DTOs. |
| Historical authoring summary | `src/stores/growth-learning-sqlite/history-summary.js` | Summary-only historical context reader for generated cards. It exposes card/evaluation/mastery/experience aggregates without raw learner submissions or transcripts. |
| Stage assessment cycles | `src/stores/growth-learning-sqlite/stage-assessment-cycles.js` | SQLite repository for `learning_growth_stage_assessment_cycles`. It supports imported Home AI schema variants such as `learner_workspace_id`, writes summary-only activation state, and returns public cycle DTOs. |
| Knowledge Graph import | `src/services/learning-graph-import-service.js`, `src/stores/growth-learning-sqlite/graph-schema.js`, `src/stores/growth-learning-sqlite/graph-repository.js`, `scripts/import-learning-graph-pack.js` | Source-pack parser, native SQLite graph importer, and domain-pack/subject option projector for recovered Growth Knowledge Graph seeds. Dry-run is the default; write mode is explicit and imports bounded graph metadata only. When a multi-pack seed omits per-node `domainPackId`, the repository infers the node pack from the node domain before falling back to the first pack. |
| Knowledge Graph planning | `src/services/learning-graph-plan-service.js`, `src/services/learning-card-graph-binding-service.js` | Validated plan creation and card binding over native graph nodes. It feeds the protected graph-plus-history generation route and can still be used directly for manual plan/binding workflows. |
| Regenerable card retirement | `src/services/growth-card-retirement-service.js`, `src/stores/growth-learning-sqlite/card-retirement.js`, `scripts/retire-growth-cards.js` | Dry-run-first workspace-scoped retirement of old board projection, pilot, and evergreen cards that can be regenerated. It hides cards from the board without hard-deleting learner history. |
| Evaluation service | `src/services/growth-evaluation-service.js` | Evaluation job claiming, deterministic evaluator boundary, reward settlement callout, and bounded event emission. |
| Plugin authorization service | `src/services/hermes-plugin-service.js` | Registration key checks, workspace-key checks, launch tokens, and Owner-only view target projection. |
| SQLite store facade | `src/stores/growth-learning-sqlite-store.js` | Public plugin-owned SQLite store API used by services. This file should shrink over time as cohesive submodules are extracted. |
| SQLite core helpers | `src/stores/growth-learning-sqlite/core.js` | Shared deterministic helpers for table discovery, dynamic inserts/upserts, bounded parsing, and primitive normalization. |
| SQLite identifiers | `src/stores/growth-learning-sqlite/identifiers.js` | Stable Growth record ids and hashes for submissions, reflections, evaluation jobs, sessions, rewards, ledger entries, and audio blobs. |
| SQLite audio metadata | `src/stores/growth-learning-sqlite/audio-metadata.js` | Bounded audio evidence parsing and public audio DTO projection shared by card projections and playback/backfill logic. |
| SQLite audio repository | `src/stores/growth-learning-sqlite/audio.js` | Plugin-owned audio playback, SQLite BLOB priority reads, bounded legacy file lookup, and historical audio BLOB backfill. |
| SQLite projections | `src/stores/growth-learning-sqlite/projection.js` | Board/card public DTO shaping, lane grouping, sequence visibility, summaries, bounded submission/evaluation/evaluation-job/reflection/reward projections, `daily_score_once` completion projection, and visible `evaluation_failed` state for exhausted evaluation jobs. |
| SQLite evidence writes | `src/stores/growth-learning-sqlite/evidence-writes.js` | Submission/reflection evidence writes, interaction session creation, evidence audio BLOB insertion, legacy kanban card id resolution, pending evaluation job enqueueing, and `daily_score_once` one-submission/one-reflection enforcement. |
| SQLite evaluation jobs | `src/stores/growth-learning-sqlite/evaluation-jobs.js` | Evaluation job listing, lease-based claiming, stale-processing recovery, completion, retry/failure state, evaluation context reads, and evaluation record writes. |
| SQLite rewards | `src/stores/growth-learning-sqlite/rewards.js` | Score-proportional daily-card reward settlement, task completion side effects, Growth learning-coin balance, and monthly clear ledger writes. |
| Embedded UI boot | `public/app.js` | Boot/wiring layer for the embedded Growth app. |
| Embedded UI adapters | `public/growth-appearance.js`, `public/growth-api-client.js`, `public/growth-view-model.js`, `public/growth-route-controller.js`, `public/growth-navigation-controller.js` | Host appearance mapping, API client/query handling, board/card view-model normalization, manifest route/action handling, and plugin-owned secondary-view back/navigation state. The API client includes card generation and stage-assessment eligibility/activation helpers. |
| Embedded card interaction UI | `public/growth-legacy-task-ui.js`, `public/growth-card-interaction-controller.js`, `public/growth-card-generation-ui.js`, `public/app.js`, `public/growth-api-client.js` | Generated card learner interaction and Owner generation surfaces. Learner daily cards support one submission, visible evaluation refresh, one reflection stage that can be submitted once, and text/audio evidence routed through plugin APIs. Owner generation supports daily cards, visible next-card recommendation rationale, read-only recommendation lifecycle history, post-publish context refresh that preserves the published preview, and stage-assessment eligibility/Owner manual activation controls. Controllers own ephemeral UI state while service/store rules remain backend-owned. |
| Migrated UI baseline | `public/growth-legacy-*.js`, `public/growth-homeai-legacy.css` | Plugin-owned copy of the migrated Growth UI baseline. Future Growth UI changes happen here, not in Home AI host files. |

## Current Refactor Boundary

The first core-module split is behavior-preserving:

- `core.js` owns shared SQLite helper behavior previously embedded in the large
  store file.
- `identifiers.js` owns stable id generation and keeps the legacy prefixes and
  explicit-id passthrough behavior.
- `audio-metadata.js` owns bounded audio evidence metadata projection shared by
  projection and playback paths.
- `audio.js` owns plugin-owned audio playback and legacy audio BLOB backfill
  while keeping file-system lookup out of the store facade.
- `projection.js` owns read-side board/card DTO shaping and Growth lane
  semantics. For generated daily cards, any terminal `daily_score_once`
  evaluation projects to completed/review state regardless of pass line or
  legacy revision wording; formal assessment cards keep the older
  revision/reflection lanes.
- `evidence-writes.js` owns plugin-owned learner evidence write transactions
  and keeps submission/reflection write behavior out of the store facade.
- `evaluation-jobs.js` owns plugin-owned evaluation queue state, Owner retry
  requeue state, bounded Owner-review audit metadata, and evaluation record
  insertion.
- `rewards.js` owns plugin-owned reward settlement and learning-coin ledger
  operations while keeping platform `Tongbao` exchange outside this refactor.
- `growth-service-models.js` and `home-ai-growth-facade-client.js` keep pure
  service DTO shaping and Home AI facade I/O outside the orchestration service.
- `growth-providers/*` and `growth-read-orchestrator.js` make read-source
  fallback policy explicit instead of embedding it in individual service
  methods.
- `growth-write-orchestrator.js` and `sqlite-write-provider.js` keep
  submission, reflection, and learning-coin commands behind a service-level
  command boundary. The default mode remains read/facade-first; plugin-owned
  writes are enabled only when `GROWTH_DATA_OWNER=plugin` selects the
  plugin-owned SQLite data path.
- `learning-graph-import-service.js`, `graph-schema.js`, and
  `graph-repository.js` own the native source-pack import boundary for
  recovered graph seeds. Dry-run validates source metadata, required graph
  fields, prerequisite endpoints/cycles, privacy markers, raw-content risk
  keys, and source-document path safety. Write mode creates `learning_graph_*`
  tables and imports bounded metadata only.
- `learning-graph-plan-service.js` and
  `learning-card-graph-binding-service.js` own graph plan and card-binding
  validation. `growth-routes.js` exposes them only through workspace-bearer
  write routes:
  `POST /api/v1/growth/graph/plans` and
  `POST /api/v1/growth/cards/:taskCardId/graph-binding`. Route glue normalizes
  snake_case/camelCase input and binds the card id from the URL.
- `growth-card-retirement-service.js`, `card-retirement.js`, and
  `retire-growth-cards.js` own old card projection cleanup. They retire
  regenerable, non-graph-bound rows from `learning_task_cards` instead of
  deleting related learner evidence, and they cancel open evaluation jobs for
  retired cards.
- Card generation belongs inside this Growth plugin. Home AI may provide the
  Gateway access/config boundary, but card authoring must not import or call
  Home AI old Growth route/server internals and must not call model vendors
  directly. The graph-plus-history generation slice is implemented in
  `learning-card-generation-context-service`,
  `learning-card-generation-service`,
  `learning-card-recommendation-service`,
  `learning-card-next-target-service`,
  `learning-card-authoring-service`,
  `growth-gateway-authoring-client`, and
  `learning-card-authoring-validation-service`, with `history-summary` and
  `card-authoring-publisher` repositories underneath. The protected runtime
  route is `POST /api/v1/growth/cards/generate`; it is workspace-bearer scoped
  and delegates to services. The publisher writes any missing native
  program/draft parent rows, the generated task card, and graph binding in one
  SQLite transaction. Generated daily cards use the
  `daily_score_once` completion policy: one submission evaluation, one
  reflection stage that can be submitted once, completion after the first
  evaluation, and
  score-proportional rewards without a pass-line gate.
  `growth-gateway-authoring-client` can speak the fake harness `{ kind,
  input }` protocol and the official Gateway `/v1/responses` protocol. The
  latter is selected by `GROWTH_GATEWAY_AUTHORING_PROTOCOL=responses` or by a
  `/v1/responses` endpoint, and it keeps model prompting inside Growth while
  provider credentials remain behind Gateway.
- If Owner does not hand-pick a target for daily generation,
  `learning-card-next-target-service` selects a graph node from
  `learning-card-recommendation-service` first. That recommendation service
  promotes the selected learner's latest pending trajectory
  `nextRecommendation` before falling back to the summary-only profile
  strategy. Legacy recommendations without a status are treated as pending,
  while accepted/skipped/expired/superseded recommendations are ignored. When a
  new trajectory recommendation is written, older pending recommendations for
  the same learner/program are marked superseded so a later accepted generation
  cannot fall back to stale work. Generic graph suggestions are used only after
  those learner-specific candidates fail to resolve. The generation context
  preview and actual generation route share this service so the shown suggested
  plan, visible recommendation rationale, and published card do not diverge.
  After a generated card publishes, `learning-card-generation-service` asks the
  next-target/recommendation services to mark the consumed trajectory
  recommendation accepted using only bounded ids and timestamps.
- Stage assessment activation is a separate Growth-owned service boundary.
  `learning-stage-assessment-service` reads summary-only profile projection,
  writes `learning_growth_stage_assessment_cycles` through
  `stage-assessment-cycles`, and calls
  `learning-card-generation-service` only after policy accepts activation.
  Routes remain HTTP glue:
  `POST /api/v1/growth/stage-assessments/eligibility`,
  `POST /api/v1/growth/stage-assessments/activate`, and
  `POST /api/v1/growth/stage-assessments/challenge`.
  Owner manual activation requires Owner role. Learner challenge activation is
  limited to the executor's own workspace and respects hard cooldown. Generated
  formal cards carry `stageAssessmentCycleId`, activation metadata,
  `formal_assessment` completion metadata, default `300` coin reward metadata,
  and mastery evidence weight `1`. After a formal evaluation is persisted,
  `growth-evaluation-service` delegates to
  `learning-stage-assessment-service` to mark the linked cycle completed,
  preserve the original cycle target, generated card id, and activation
  metadata, and set the next cooldown window.
- The AI card loop is Growth-owned. `learning-mastery-profile-service`,
  `learning-card-trajectory-service`, and `learning-next-card-strategy-service`
  close the first service slice from evaluation evidence to profile update,
  trajectory, and next-card strategy. Evaluation is the evidence boundary;
  reward settlement must not directly mutate mastery state. Mastery writes use
  bounded evidence weights: ordinary generated daily cards currently use low
  evidence weight, while formal `stage_assessment` cards use weight `1` and
  cover declared assessment coverage nodes. Repository writes also merge
  legacy mastery rows by workspace, learner, program, and node to avoid
  duplicate profile states for the same capability. See
  `docs/GROWTH_AI_CARD_LOOP.md`.
- Gateway-backed evaluation is Growth-owned. `learning-card-evaluation-service`
  calls `growth-gateway-evaluation-client` only when
  `GROWTH_GATEWAY_EVALUATION_ENDPOINT` is configured; otherwise
  `growth-evaluation-service` keeps the deterministic evaluator as the local
  fallback. Gateway is the only model boundary for Growth card evaluation.
  The client supports the fake harness `{ kind, input }` protocol and the
  official Gateway `/v1/responses` protocol, selected by
  `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses` or inferred from a
  `/v1/responses` endpoint. Output is an evaluation draft until validation
  accepts schema `growth.card.evaluation.v1`, daily-card policy,
  `skillResults` graph bindings, and privacy and bounded-content scans.
  Invalid JSON, empty output, missing fields, privacy-risk fields, timeout, or
  repair pass failure must not write a partial `learning_evaluations` row. If
  retries are exhausted and no evaluation row exists, `projection.js` exposes a
  bounded `latestEvaluationJob` plus `evaluation_failed` lane/action so the
  learner sees a visible failure and Owner-review path instead of a hidden
  waiting state.
- Owner profile/trajectory projection is Growth-owned. The Owner card
  generation view reads the selected learner's `learningProfile` from
  `learning-profile-projection-service` through
  `learning-card-generation-context-service`. The same context service also
  exposes Owner-safe Profile V2 from `learning-profile-v2-service`, bounded
  `evidenceAudit` rows from `learning-evidence-ledger-service`, and
  `plannerReadiness` / `plannerContextPreview` from
  `learning-planner-context-service`. It also exposes an `ownerAudit`
  projection by reading public DTOs from
  `learning-plan-audit-service`,
  `learning-profile-delta-audit-service`, and
  `learning-owner-correction-service`; the context service must not recompute
  profile deltas from raw profile snapshots. These projections include bounded
  mastery states, strengths, weaknesses, recent experience signals, recent
  trajectories, plan draft ids, selected plan items, generated card ids,
  generated graph-plan ids, evidence ids, candidate graph nodes, planner
  privacy flags, persisted profile-delta summaries, Owner correction summaries,
  and the explicit next-card recommendation reason. They are read-only and
  must use the selected target workspace, not the Owner workspace, when Owner
  is viewing another learner. They must not expose raw answers, transcripts,
  prompts, answer keys, raw model output, private file paths, or repository
  source refs.
- Owner-reviewed profile correction is Growth-owned. The route layer exposes
  `GET /api/v1/growth/profile-corrections` and Owner-only
  `POST /api/v1/growth/profile-corrections`, but correction policy lives in
  `learning-owner-correction-service`. The service validates target
  provisioning, writes summary-only `owner_reviewed_correction` rows through
  `learning-evidence-ledger-service`, and reads grouped public DTOs from the
  ledger. `learning-profile-v2-service` treats those rows as auditable state
  adjustments while retaining older evidence ids and source types. The service
  must not write raw answers, transcripts, prompts, answer keys, raw model
  output, source-document bodies, private paths, credentials, or provider
  configuration.
- Target/domain-pack provisioning is Growth-owned. `view-targets` controls
  which learner records an actor can see; `learning-target-provisioning-service`
  controls which domain pack, domain, subject, and graph-node set Growth may
  use for planning and generation. `growth-routes.js` may expose an Owner-only
  `POST /api/v1/growth/domain-pack-provisions` route, but route code must stay
  authorization and DTO glue. The service and
  `domain-pack-provisions.js` repository own validation, persistence, public
  projection, and Fanfan sample fallback.
- Owner card generation management is exposed through the embedded plugin UI.
  The Owner `生成` tab reads
  `GET /api/v1/growth/card-generation/context`, keeps learner targets separate
  from the Owner actor, renders the selected learner's profile/trajectory
  projection, and posts generation requests to
  `POST /api/v1/growth/cards/generate`. The frontend never calls Gateway or
  model vendors directly. Through the Home AI same-origin plugin proxy, write
  requests receive the server-side `.hermes-growth/access-key.txt` bearer after
  Hermes workspace access is checked; direct plugin-port writes still require
  the bearer explicitly.
- `growth-appearance.js`, `growth-api-client.js`, `growth-view-model.js`, and
  `growth-route-controller.js` keep host integration, API calls, UI
  normalization, and route/action resolution outside the boot script.
- Generated card interaction is now plugin-local: `growth-legacy-task-ui.js`
  renders the old-style vertical card-detail workflow for generated daily
  cards: status rail, score policy, learning target, lesson, guided practice,
  submission, audio recorder, evaluation, optional reflection, and completion
  feedback;
  `growth-navigation-controller.js` owns plugin navigation state for Growth
  secondary views, emits `growth.plugin.navigation`, consumes
  `hermes.plugin.back` while a card detail is open, and returns
  `growth.plugin.back_result` so Home AI right-swipe goes back to the Growth
  list before leaving the plugin;
  `growth-card-interaction-controller.js` owns browser recording state,
  record/play MIME selection, local preview playback errors,
  submission/reflection event flow, visible error messages, and evaluation
  refresh calls; `growth-api-client.js` exposes card
  fetch/submission/evaluation/reflection helpers plus embedded-proxy audio URL
  resolution; `app.js` wires page state and route calls only.
  One-submission/one-reflection, evaluation, and reward completion rules still
  live in `evidence-writes.js`, `growth-evaluation-service.js`, and
  `rewards.js`.
- SQLite audio projection preserves playback containers: explicit non-generic
  stored audio MIME values are honored, `.webm` is served as `audio/webm`, and
  legacy `.ogg` / `.opus` records remain `audio/ogg`. This boundary prevents
  plugin-owned audio routes from returning a playable WebM BLOB with an Ogg
  content type.
- `growth-learning-sqlite-store.js` remains the public facade while deeper
  modules are extracted.

This keeps service contracts stable while making future extractions smaller and
easier to verify.

## Next Extraction Targets

The current core architecture target is implemented. Future extractions should
be feature-driven:

1. Add an Owner-safe embedded UI surface for plan preview and explicit publish
   on top of the backend plan draft/publish routes.
2. Expose provisioned `graphOptions`, `targetProvisioning`, and Owner
   provision controls in the embedded UI.
3. Run production planner readiness smoke and launchd config verification for
   the planner Gateway boundary before enabling planner UI in production.
4. Generalize the service-level Fanfan science vertical into provisioned
   subject/domain-pack selection for any authorized and provisioned target.
5. Add an embedded Owner audit UI for profile-delta and profile-correction
   DTOs plus plan publish-attempt status; the backend correction read/write
   route, publish-attempt audit metadata, and audit-completeness route are
   implemented.
6. Add an Owner-reviewed proposal UI on top of
   `GET`/`POST /api/v1/growth/automation/proposals` and
   `POST /api/v1/growth/automation/proposals/:proposalId/decision` plus
   `POST /api/v1/growth/automation/proposals/:proposalId/publish` only after
   the audit UI can explain the source cycle. Proposal review must stay manual
   and must not start scheduling.
7. Add the automation digest UI described in
   `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` before any writeful
   scheduler. The service, repository, Owner routes, privacy guard, and
   architecture guard are implemented locally; review UI and visual evidence
   remain future work.
8. Add the automation action handoff UI / platform evidence described in
   `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md` before any writeful
   scheduler. The service, repository, Owner routes, event mapping, delivery
   failure guard, and architecture guard are implemented locally; product UI,
   central platform Action Inbox/Web Push evidence, and visual evidence remain
   future work.
9. Add a Growth-domain event dispatcher only when submission, reflection,
   evaluation, reward, notification, or audit behavior needs durable fan-out.
10. Split the SQLite store facade into narrower repository interfaces only when
   callers need independent composition of evidence, reward, audio,
   evaluation, or projection repositories.
10. Split legacy UI renderers only when the migrated UI baseline is redesigned;
   do not refactor those files only for shape.

## Harness Map

| Boundary | Required checks |
| --- | --- |
| SQLite core helpers and identifiers | `node --test tests/growth-learning-sqlite-core.test.js` |
| SQLite audio playback and backfill | `node --test tests/growth-learning-sqlite-audio.test.js` |
| SQLite public projections | `node --test tests/growth-learning-sqlite-projection.test.js` |
| SQLite evidence writes | `node --test tests/growth-learning-sqlite-evidence-writes.test.js` |
| SQLite evaluation queue, Owner retry, and records | `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/learning-evaluation-owner-review-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| SQLite rewards and learning coin ledger | `node --test tests/growth-learning-sqlite-rewards.test.js` |
| Regenerable card retirement | `node --test tests/growth-card-retirement-service.test.js` |
| SQLite store facade behavior | `node --test tests/growth-learning-sqlite-store.test.js` |
| Growth service models and facade client | `node --test tests/growth-service-models.test.js tests/growth-service.test.js` |
| Growth service providers and fallback policy | `node --test tests/growth-service-providers.test.js tests/growth-service.test.js` |
| Growth service write providers and command policy | `node --test tests/growth-service-write-providers.test.js tests/growth-service.test.js tests/growth-routes.test.js` |
| Growth Knowledge Graph import | `node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js` |
| Growth Knowledge Graph plan and binding | `node --test tests/learning-graph-plan-binding-service.test.js tests/growth-routes.test.js` |
| Growth card authoring and generation boundary | `node scripts/check-growth-card-authoring-boundary.js && node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-card-next-target-service.test.js tests/growth-routes.test.js` |
| Growth AI card loop profile, trajectory, recommendation lifecycle, strategy, projection, Gateway evaluation, stage-assessment completion, Owner recovery, route entry, and closed-loop card progression | `node --test tests/learning-card-ai-loop-harness.test.js tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-stage-assessment-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-next-card-strategy-service.test.js tests/growth-evaluation-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-next-target-service.test.js tests/learning-evaluation-owner-review-service.test.js` |
| Learning operating loop foundation, planner readiness smoke, target provisioning, graph options, evidence audit, plan audit, plan publish-attempt audit, profile-delta audit, Owner profile correction, Fanfan science vertical, and non-sample provisioned science vertical | `node --test tests/learning-evidence-ledger-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-profile-v2-service.test.js tests/learning-owner-correction-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-repository.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-profile-delta-service.test.js tests/learning-planner-context-service.test.js tests/learning-plan-orchestrator-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-target-provisioning-service.test.js tests/growth-planner-readiness-smoke-script.test.js tests/learning-graph-repository.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-evaluation-service.test.js tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Owner profile correction backend | `node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-owner-correction-service.test.js tests/learning-profile-v2-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Owner audit readback context | `node --test tests/growth-owner-audit-smoke-script.test.js tests/learning-card-generation-context-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-owner-correction-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Owner daily-loop backend facade | `node --test tests/growth-daily-loop-smoke-script.test.js tests/growth-daily-loop-preview-smoke-script.test.js tests/learning-daily-loop-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-plan-publisher-service.test.js tests/learning-cycle-audit-service.test.js tests/learning-audit-completeness-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Learning-cycle audit aggregate | `node --test tests/learning-cycle-audit-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-plan-audit-service.test.js tests/learning-profile-delta-audit-service.test.js tests/learning-owner-correction-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Learning audit completeness readback | `node --test tests/learning-audit-completeness-service.test.js tests/learning-cycle-audit-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Supervised automation proposal dry-run | `node --test tests/learning-automation-proposal-repository.test.js tests/learning-automation-proposal-service.test.js tests/learning-audit-completeness-service.test.js tests/learning-plan-publisher-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Supervised automation scheduler dry-run | `node --test tests/growth-scheduler-dry-run-smoke-script.test.js tests/learning-automation-scheduler-service.test.js tests/learning-automation-proposal-service.test.js tests/learning-audit-completeness-service.test.js tests/learning-target-provisioning-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation digest gate | `node --test tests/learning-automation-digest-repository.test.js tests/learning-automation-digest-service.test.js tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation failure policy gate | `node --test tests/learning-automation-failure-policy-repository.test.js tests/learning-automation-failure-policy-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Automation release-readiness gate | `node --test tests/learning-automation-release-readiness-repository.test.js tests/learning-automation-release-readiness-service.test.js tests/growth-release-readiness-smoke-script.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js` |
| Growth learner experience signal writes | `node --test tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-frontend-adapter.test.js` |
| Embedded frontend adapters, card generation UI, learner card interaction UI, and Owner evaluation retry action | `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/learning-card-generation-context-service.test.js tests/learning-profile-projection-service.test.js` |
| Architecture boundary guard | `node --test tests/growth-architecture-boundary.test.js` |
| Growth route authorization and HTTP contracts | `node --test tests/growth-routes.test.js` |
| Growth service facade/snapshot/provider selection | `node --test tests/growth-service.test.js` |
| MCP schema and wrapper boundary | `node --test tests/growth-mcp-schemas.test.js tests/growth-mcp-wrapper.test.js` |
| Embedded scroll/layout contract | `node --test tests/growth-embedded-layout.test.js` |
| Full local gate | `npm run check && npm test && git diff --check` |

## Rules For Future Changes

- Route modules should remain HTTP glue. If a route grows business branching,
  move it to a service.
- Store submodules should expose deterministic functions over `db` and plain
  inputs. They should not read env vars, launch services, or call Home AI.
- Growth card authoring must call models only through Gateway. Do not add
  direct vendor clients, provider API keys, or provider endpoints to Growth
  authoring code.
- Public projections must stay bounded. Do not expose raw private file paths,
  raw access keys, launch tokens, full prompts, or unbounded learner payloads.
- New Growth-domain workflows must add focused tests at the module boundary
  before broad `npm test`.
- Platform `Tongbao` exchange remains outside this plugin-internal refactor.
