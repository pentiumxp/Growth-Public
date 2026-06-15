# Growth Plugin Project Context

## Purpose

This workspace is the clean Home AI Growth embedded plugin workspace.

The older Mac `growth` directories were Home AI full-repository clones, not
standard plugins. They remain useful only as references to the built-in Growth
module and have been archived outside this workspace.

## Canonical Platform Contract

Read `docs/HOME_AI_PLATFORM_CONTRACT.md` first for local facts and canonical
Home AI contract links.

Growth-specific documents are owned by this plugin workspace. Use
`docs/GROWTH_DOCS_INDEX.md` as the local index for Growth product,
architecture, card-generation, implementation, and runbook documents. Broad
Home AI platform contracts remain in the Home AI app workspace by pointer.

## Current State

- Plugin id: `growth`.
- Default local port: `4881`.
- Registration credential env: `GROWTH_REGISTRATION_KEY` or
  `GROWTH_REGISTRATION_KEY_PATH`.
- Workspace binding: `.hermes-growth/config.json` and
  `.hermes-growth/access-key.txt`.
- Current implementation owns plugin SQLite read projections, migrated audio
  playback, historical audio BLOB backfill tooling, workspace-bound read-only
  MCP tools, workspace-bearer submission/reflection evidence write endpoints,
  async evaluation processing, per-card Growth learning coin settlement, and
  bounded completion/mastery/review event emission. It also owns native
  knowledge-graph import/planning/binding and Gateway-backed card generation
  from graph plans plus historical SQLite summaries. New generated daily cards
  use `daily_score_once`: one submission stage, one evaluation stage, one
  reflection stage, completion after the first evaluation, and
  score-proportional rewards without a pass-line gate. The generated-card
  learner UI may expose at most one active text submission box per stage.
  Stage assessment cards are separate formal cards: activation is owned by
  `learning-stage-assessment-service`, formal evaluation writes higher-weight
  mastery evidence across declared assessment coverage nodes, and completed
  assessment cycles move into cooldown. The next target architecture is the
  Growth-owned AI learning operating loop documented in
  `docs/GROWTH_LEARNING_OPERATING_LOOP.md`: evidence ledger, Profile V2,
  Gateway-backed planner, post-evaluation profile-delta audit,
  target/domain-pack provisioning, Owner audit, low-pressure cross-subject
  cards, and future multi-workspace/domain-pack generalization. The first backend
  foundation now includes summary-only `learning_growth_evidence_ledger`
  writes, Profile V2 projection, planner context assembly, Gateway planner
  client, plan validation, draft orchestration, summary-only plan draft
  persistence, and a backend plan publisher route that can publish a selected
  validated plan item through the existing card-generation service. The
  execution blueprint for the broader AI-driven loop is
  `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`; it now includes the
  staged execution roadmap from current backend state to Owner-supervised
  daily loop, audit/correction UI, stage-checkpoint loop, multi-workspace
  rollout, and later supervised scheduling. Owner
  generation context now exposes planner readiness, planner context preview,
  Owner-safe Profile V2, bounded evidence audit, and `domain`/`subject` /
  `domainPackId` query selection through the existing visible-target route.
  It also projects provisioned native graph `graphOptions` and
  `targetProvisioning` for domain-pack and subject selection, and the planner
  orchestrator exposes a bounded no-write readiness smoke through
  `npm run smoke:planner-readiness`. Planner horizon policy now validates
  low-pressure `daily_plan`, short no-backlog `weekly_plan`, low-pressure
  `repair_plan`, and `stage_checkpoint_plan` suggestions that must activate
  through `learning-stage-assessment-service`; planner context now includes
  read-only stage-assessment readiness through
  `learning-stage-assessment-service.stageReadiness()`, and the plan publisher
  refuses direct formal stage-assessment publication. A service-level
  Fanfan science vertical harness now proves planner draft, publish, science
  card generation, learner evidence, Gateway evaluation, evidence ledger, and
  Profile V2 feedback. The staged delivery roadmap for the supervised AI
  learning system is now summarized first in
  `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`; the closed-loop contract is in
  `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`, with staged delivery captured
  in `docs/GROWTH_AI_LEARNING_ROADMAP.md`. The next-stage execution selector is
  `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`; it records the current
  execution decision, the preferred product-visible Owner daily loop path, the
  backend-only release-readiness evidence path, Fanfan science daily playbook,
  readiness semantics, harness matrix, and definition of done. The
  release-readiness backend boundary is
  now represented by `learning-automation-release-readiness-service`,
  `automation-release-readiness.js`,
  `learning_growth_automation_release_readiness`, visible-target readiness
  read/list routes, and Owner-only snapshot creation; it is advisory evidence
  only and always keeps `writefulSchedulingAllowed=false`. Explicit approval
  records for writeful config gates are now Growth-owned as
  `learning-automation-release-approval-service`,
  `automation-release-approvals.js`, and
  `learning_growth_automation_release_approvals`, with visible-target scoped
  `GET /api/v1/growth/automation/release-approvals`, Owner-only
  `POST /api/v1/growth/automation/release-approvals`, and
  `npm run smoke:release-approval`; release-readiness can read active approval
  records as `releaseReview.persistedApprovalKeys`, but approval records remain
  advisory evidence and never flip runtime config. It now treats
  production controlled daily-loop draft/publish smoke evidence as a separate
  required readiness check while still never calling daily-loop services from
  the release-readiness boundary. It now also has
  `npm run smoke:release-readiness`, a service-owned CLI that defaults to
  no-write readiness evaluation, accepts
  `--automation-digest-ui-evidence`,
  `--automation-action-handoff-ui-evidence`,
  `--scheduler-execution-ui-evidence`, `--scheduler-run-ui-evidence`, and
  `--scheduler-worker-target-ui-evidence` as Owner automation UI evidence
  flags, accepts
  `--production-action-handoff-smoke-evidence` after
  `npm run smoke:action-handoff` has produced bounded Growth-side action
  handoff smoke evidence, accepts
  `--production-scheduler-execution-smoke-evidence` after
  `npm run smoke:scheduler-execution` has produced bounded default-disabled
  execution evidence, accepts `--production-scheduler-run-smoke-evidence`
  after `npm run smoke:scheduler-run` has produced bounded default-disabled
  run evidence, accepts `--production-scheduler-worker-target-smoke-evidence`
  after `npm run smoke:scheduler-worker-target` has produced bounded reviewed
  target evidence, accepts
  `--production-scheduler-worker-smoke-evidence` after
  `npm run smoke:scheduler-worker` has produced bounded production worker
  smoke evidence, accepts
  `--production-planner-readiness-evidence` after
  `npm run smoke:planner-readiness` has produced bounded no-write production
  planner readiness evidence, accepts
  `--production-daily-loop-preview-smoke-evidence` after
  `npm run smoke:daily-loop-preview` has produced bounded no-write production
  daily-loop readiness evidence, accepts
  `--production-learning-loop-state-smoke-evidence` after
  `npm run smoke:learning-loop-state` has produced bounded no-write production
  learning-loop state evidence, accepts
  `--production-daily-loop-write-smoke-evidence` as a bounded evidence flag,
  accepts `--production-scheduler-dry-run-smoke-evidence` after
  `npm run smoke:scheduler-dry-run` has produced bounded no-write production
  scheduler dry-run evidence, and also performs an internal no-write scheduler
  dry-run safety check from the release-readiness service,
  accepts versioned `growth.learningAutomationReleaseEvidenceBundle.v1`
  evidence bundles through `--evidence-bundle-file` or
  `--evidence-bundle-json`. Growth now also has
  `npm run smoke:release-evidence-bundle`, a service-owned bundle builder
  that runs selected no-write/default-disabled smoke CLIs, emits a
  summary-only `growth.learningAutomationReleaseEvidenceBundle.v1` artifact,
  includes learning-loop state smoke in the default task set,
  and can feed `npm run smoke:release-readiness -- --evidence-bundle-file`
  without hand-splicing JSON in Codex. The builder does not write business
  state, does not call Gateway, and does not change release-readiness or
  scheduler permission. Release-readiness writes a summary-only advisory
  snapshot only when `--write-snapshot` is explicitly supplied. Scheduler dry-run now
  also has `npm run smoke:scheduler-dry-run`, a service-owned no-write CLI
  that delegates to `learning-automation-scheduler-service.dryRun` through the
  normal service graph and provides local or production dry-run evidence
  without Gateway calls, publication, scheduler execution, scheduler ticks,
  notification delivery, stage activation, direct repository access, or
  learner-state mutation. Daily-loop preview now also has
  `npm run smoke:daily-loop-preview`, a service-owned no-write CLI that
  delegates to `learning-daily-loop-service.preview` through the normal service
  graph and provides local or production daily-loop context/readiness evidence
  without Gateway calls, plan draft/publish, card generation, scheduling,
  notifications, stage activation, direct repository access, SQLite writes, or
  learner-state mutation. Learning-loop state now also has
  `npm run smoke:learning-loop-state`, a service-owned no-write CLI that
  delegates to `learning-loop-state-service` through the normal service graph.
  It projects compact `growth.learningLoopState.v1` summary-only state and the
  next Owner action from daily-loop preview plus stage-assessment readiness,
  without Gateway calls, plan publication, card generation, evaluation,
  scheduling, stage activation, direct repository access, SQLite writes, or
  learner-state mutation. The Owner `生成` tab now reads the same
  `GET /api/v1/growth/learning-loop/state` route after generation context load
  and renders a read-only compact state/next-action panel without adding any
  browser-side learning policy or write path. Controlled daily-loop
  draft/publish smoke evidence is
  now available through `npm run smoke:daily-loop`; it defaults to preview, and
  `draft` or `publish` operations require the explicit `--allow-write` flag.
  That CLI still delegates only through `learning-daily-loop-service` and the
  normal service graph; it does not import repositories, call Gateway directly,
  call the plan publisher or card generator directly, run schedulers, deliver
  notifications, or activate stage assessments. Formal checkpoint operational
  evidence is now available through `npm run smoke:stage-assessment`; it
  defaults to read-only `learning-stage-assessment-service.stageReadiness`,
  while `eligibility`, `activate`, and `complete` require explicit
  `--allow-write` and delegate only to `learning-stage-assessment-service`
  through the normal service graph. It does not import repositories, call
  Gateway directly, publish through plan services, evaluate submissions, run
  automation, or mutate learner state outside the stage-assessment service.
  The broad local `npm run check`
  gate now syntax-checks every Growth runtime JavaScript file under `scripts/`,
  `src/`, and `public/`, with `scripts/check-growth-syntax-coverage.js` and
  `tests/growth-architecture-boundary.test.js` enforcing no missing, stale, or
  duplicate check entries. The system scheme,
  plan, roadmap, and
  next-stage plan are the implementation-planning entry points for product
  thesis,
  non-negotiable principles, the supervised learning-program model,
  daily/checkpoint/program time scales, delivery stages, release gates, data
  ownership, model boundaries, capability model, scientific learning policy,
  Owner operating modes, automation maturity, the Fanfan science daily-card
  playbook, capability readiness levels, documentation/harness contract, and
  the immediate learning-cycle audit aggregate plus Owner-supervised daily
  planning UI slices. The scheme docs now also define the end-state capability
  definition, current-capability versus product-complete distinction, closure
  ladder, stage-gate map, implementation package contract, architecture
  optimization backlog, scheduler dry-run-first boundary, and automation
  digest gate so future work can proceed from Growth-local documents rather
  than thread-local planning notes. The scheme docs also now separate the
  Growth learning system into scope/graph, learner-state, model-draft,
  learning-action, and audit/next step planes, and distinguish backend-capable,
  browser-operable,
  release-reviewable, and writeful-automation-allowed states so release
  readiness cannot be mistaken for scheduler permission.
  `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` is the durable execution
  plan for target outcome, current backend baseline, non-negotiable
  boundaries, W1-W7 program-level workstreams, model-entered steps, durable
  state ownership, delivery packages, immediate implementation choice, and
  definition of done.
  `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md` is the
  durable plan for the digest service/repository/routes/UI/harness that must
  precede writeful scheduling, notification handoff, or automatic publication.
  The multi-workspace/domain-pack backend slice now includes graph import
  domain-pack inference for multi-pack seeds that omit per-node
  `domainPackId`, graph plan/card audit propagation of `domainPackId`,
  `domain`, and `subject`, and a non-sample provisioned science vertical
  harness that proves unprovisioned blocking, explicit provision enablement,
  wrong-subject blocking, and target-workspace scoped plan/card/evidence/
  Profile V2/profile-delta rows.
  Evidence-ledger audit readback is now implemented through
  `learning-evidence-audit-service` and visible-target scoped
  `GET /api/v1/growth/evidence/audit`, with filters for learner, program,
  evidence id, source type/id, task-card id, card role, status, target nodes,
  and limit. The route returns bounded summary-only evidence history DTOs
  without exposing raw ledger table rows or private summary fields.
  Learning-cycle audit aggregation is now implemented through
  `learning-cycle-audit-service` and visible-target scoped
  `GET /api/v1/growth/learning-cycles/audit`; it composes public plan,
  evidence, profile-delta, and Owner-correction readbacks into bounded counts
  and a timeline for one card/evaluation/plan without route-level table access
  or raw private payload projection.
  Audit-completeness readback is now implemented through
  `learning-audit-completeness-service` and visible-target scoped
  `GET /api/v1/growth/learning-cycles/completeness`; it evaluates the public
  cycle-audit DTO for required plan publication or publish-attempt visibility,
  evaluation evidence, profile-delta audit, downstream partial failures, and
  privacy projection before UI closure or future supervised automation dry
  runs. It is read-only and does not call Gateway, write durable state, or start
  scheduling.
  The supervised automation proposal scheme is now locally implemented as the
  first non-scheduling automation layer: proposal creation requires a previous
  source-cycle id, audit-completeness readiness, target/domain-pack
  provisioning, and summary-only persistence in
  `learning_growth_automation_proposals`; it may draft a plan only through
  `learning-plan-publisher-service.draftPlan`. Owner review is recorded
  through `POST /api/v1/growth/automation/proposals/:proposalId/decision`
  with terminal statuses `accepted`, `skipped`, `expired`, and `superseded`.
  Accepted proposals return the explicit Owner publish action but do not
  publish cards during decision. Explicit accepted-proposal publication is now
  implemented through
  `POST /api/v1/growth/automation/proposals/:proposalId/publish`, which
  requires Owner role, target visibility, `status=accepted`, delegates only to
  `learning-plan-publisher-service.publishPlanItem`, and records bounded
  execution metadata in `learning_growth_automation_proposals`. Successful
  execution is idempotent; failed/blocked execution stays visible for explicit
  Owner retry. The proposal layer must not call Gateway directly, call card
  generation directly, activate stage assessments, or start a scheduler. The
  repository rejects privacy-risk keys and non-summary privacy classes,
  migrates missing bounded decision/execution columns, treats duplicate
  same-status decisions as idempotent, and rejects conflicting terminal
  decisions. Focused proposal repository/service/route/architecture harnesses
  pass; proposal review UI remains a later slice.
  The supervised scheduler dry-run boundary is now locally implemented through
  `learning-automation-scheduler-service` and Owner-only
  `POST /api/v1/growth/automation/scheduler/dry-run`. It lists accepted
  proposals through the proposal service, skips already-published executions,
  rechecks source-cycle audit completeness and target provisioning, and returns
  bounded `would_publish`, blocked, or skipped candidates with `dryRun=true`,
  `writePlanned=false`, `writesPerformed=false`, and `publishPlanned=false`.
  It must not call Gateway, publish plans, generate cards, record proposal
  execution, send notifications, activate stage assessments, or inspect SQLite
  tables directly. Background writeful scheduling remains blocked until
  proposal review, audit UI, automation digest/action/execution UI,
  rollback/failure policy, action handoff, platform Action Inbox/Web Push
  evidence, visual evidence, and explicit release evidence are implemented and
  covered by harness.
  The automation digest backend is now implemented through
  `learning-automation-digest-service`, `automation-digests.js`,
  `learning_growth_automation_digests`, and visible-target/Owner scoped
  `/api/v1/growth/automation/digests` routes. It persists summary-only
  scheduler dry-run packets and bounded review metadata while preserving
  `dryRun=true`, `writePlanned=false`, `writesPerformed=false`, and
  `publishPlanned=false`; it must not publish, record proposal execution,
  notify, enqueue, call Gateway, or activate stage assessments.
  `npm run smoke:digest` is the service-owned operational smoke for this
  boundary: `list` is the default read-only operation, `get` is read-only, and
  `create`/`review` require explicit `--allow-write` while delegating only to
  `learning-automation-digest-service`.
  The automation failure-policy backend is now implemented through
  `learning-automation-failure-policy-service`,
  `automation-failure-policies.js`,
  `learning_growth_automation_failure_policies`, and visible-target/Owner
  scoped `/api/v1/growth/automation/failure-policies` routes. It stores
  summary-only policy/rollback/failure metadata, activates draft policies only
  through Owner review, reports active policy readiness as one future
  scheduling prerequisite, and keeps `writefulSchedulingAllowed=false`; it
  must not publish, call Gateway, call scheduler dry-run, record proposal
  execution, notify, enqueue, or activate stage assessments.
  `npm run smoke:failure-policy` is the service-owned operational smoke for
  this boundary: `readiness` is the default read-only operation, `list` is
  read-only, and `create`/`review` require explicit `--allow-write` while
  delegating only to `learning-automation-failure-policy-service`.
  The automation action handoff backend is now implemented through
  `learning-automation-action-handoff-service`,
  `automation-action-handoffs.js`,
  `learning_growth_automation_action_handoffs`, and visible-target/Owner
  scoped `/api/v1/growth/automation/action-handoffs` routes. It creates
  summary-only handoff records only after reviewed digest and active
  failure-policy gates, emits bounded `growth.automation.action_required`
  metadata through `growth-event-service`, and records delivered or
  `delivery_failed` status without publishing cards, recording proposal
  execution, scheduling work, calling Gateway, or mutating learner state.
  `npm run smoke:action-handoff` now provides the service-owned operational
  smoke for this boundary: `list` is the default read-only operation, while
  `create` and `deliver` require explicit `--allow-write` and still delegate
  only to `learning-automation-action-handoff-service`.
  The automation scheduler execution backend is now implemented through
  `learning-automation-scheduler-execution-service`,
  `automation-scheduler-executions.js`,
  `learning_growth_automation_scheduler_executions`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/executions`, and Owner-only
  `POST /api/v1/growth/automation/scheduler/execute-once`. It supports only
  `owner_explicit_once`, defaults disabled through
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=false`, records bounded blocked
  execution when disabled, rechecks delivered handoff, reviewed digest, active
  failure-policy readiness, and scheduler dry-run before publication when
  enabled, and delegates only to accepted-proposal publish. It is not a
  background scheduler or production auto-scheduling enablement.
  `npm run smoke:scheduler-execution` now provides the service-owned
  operational smoke for this boundary: `list` is the default read-only
  operation, while `execute` requires explicit `--allow-write` and still
  delegates only to `learning-automation-scheduler-execution-service`. With
  writeful execution disabled, explicit execution records a bounded blocked
  row rather than publishing.
  The background scheduler contract is documented in
  `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`. Its local
  backend boundary is implemented as default-disabled
  `learning-automation-scheduler-run-service`,
  `automation-scheduler-runs.js`,
  `learning_growth_automation_scheduler_runs`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/runs`, and Owner-only
  `POST /api/v1/growth/automation/scheduler/run-once`. It also includes a
  reviewed worker target configuration backend through
  `learning-automation-scheduler-worker-target-service`,
  `automation-scheduler-worker-targets.js`,
  `learning_growth_automation_scheduler_worker_targets`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/worker-targets`, and Owner-only
  create/review routes. Worker target creation requires target/domain-pack/
  subject provisioning, review can move targets to `enabled`, `disabled`, or
  `archived`, and production worker targets must come from reviewed enabled
  rows rather than environment JSON alone. It also includes a
  default-disabled worker/lease backend through
  `learning-automation-scheduler-worker-service`,
  `automation-scheduler-worker-leases.js`, and
  `learning_growth_automation_scheduler_worker_leases`, with optional HTTP
  timer glue controlled by
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false`. The run/tick boundary
  must record blocked state while
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=false`, may inspect
  delivered handoffs only when explicitly enabled, delegates individual
  candidates only to the execution service, and must not become production
  unattended scheduling without platform action evidence, central visual
  evidence, production dry-run evidence, reviewed enabled worker targets,
  focused harnesses, and persisted explicit release approval. Focused repository/service/
  route/HTTP-glue/architecture harnesses cover disabled config, invalid mode,
  no delivered actions, execution delegation, partial downstream execution,
  domain/horizon filters, worker target create/review/list, active/stale
  worker leases, migration, privacy rejection, and Service First/
  no-direct-Gateway guards.
  `npm run smoke:scheduler-run` now provides the service-owned operational
  smoke for the scheduler run/tick boundary: `list` is the default read-only
  operation and delegates only to
  `learning-automation-scheduler-run-service.listRuns`; `run` requires
  explicit `--allow-write` and delegates only to
  `learning-automation-scheduler-run-service.runOnce`. With background
  scheduling disabled, explicit run records a bounded blocked row and must not
  list handoffs, execute actions, publish, call Gateway, run worker timers,
  activate stage assessments, or mutate learner state.
  `npm run smoke:scheduler-worker-target` now provides the service-owned
  operational smoke for reviewed worker target configuration: `list` is the
  default read-only operation and delegates only to
  `learning-automation-scheduler-worker-target-service.listTargets`;
  `runnable` / `list-runnable` is read-only and delegates only to
  `listRunnableTargets`; `create` and `review` require explicit
  `--allow-write` and delegate only to
  `learning-automation-scheduler-worker-target-service.createTarget` /
  `reviewTarget`. The CLI keeps `productionSchedulingAllowed=false` and must
  not start workers, claim leases, call scheduler run/execution, inspect
  handoffs, publish, call Gateway, generate cards, activate stage assessments,
  or mutate learner evidence/profile state. Environment JSON targets remain a
  local fallback, not production approval.
  `npm run smoke:scheduler-worker` now provides the service-owned operational
  smoke for the worker/lease boundary: the default `status` operation delegates
  to `learning-automation-scheduler-worker-service.tickTargets` and wraps
  `learning_automation_scheduler_worker_disabled` as expected no-write evidence
  while `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false`; enabled
  `tick` / `tick-targets` operations require explicit `--allow-write` and
  still delegate only to the worker service. With the scheduler run gate still
  disabled, write-gated worker evidence records blocked lease/run state rather
  than publishing. The CLI must not import repositories, call Gateway, call
  scheduler run/execution services directly, inspect handoffs, publish,
  generate cards, activate stage assessments, or mutate learner evidence/
  profile state.
  The Owner daily-loop backend facade is now implemented through
  `learning-daily-loop-service` and Owner-only
  `GET /api/v1/growth/daily-loop/preview`,
  `POST /api/v1/growth/daily-loop/draft`, and
  `POST /api/v1/growth/daily-loop/publish`. It composes card-generation
  context, plan publisher, cycle audit, and audit-completeness services into
  bounded preview/draft/publish DTOs; publish responses strip generated
  authoring draft internals and refresh bounded audit/completeness state. It
  does not call Gateway directly, card generation directly, SQLite tables,
  notifications, Action Inbox, stage-assessment activation, or scheduling.
  The Owner learning-loop state read is now implemented through
  `learning-loop-state-service` and Owner-only
  `GET /api/v1/growth/learning-loop/state`. It composes the existing
  daily-loop preview DTO and read-only `learning-stage-assessment-service`
  readiness into compact `growth.learningLoopState.v1` state/next-action
  output for UI/harness use. It is no-write, summary-only, and does not call
  Gateway, publish plans, generate cards, evaluate submissions, run schedulers,
  deliver notifications, activate stage assessments, or inspect SQLite tables.
  `npm run smoke:daily-loop` now provides a controlled local/production smoke
  entry for the same service boundary: preview is the default no-write
  operation, while `--operation draft` and `--operation publish` are rejected
  unless `--allow-write` is present; publish also requires a selected
  `--plan-draft-id`. This complements the no-write
  `npm run smoke:daily-loop-preview` command.
  Embedded UI consumption and central visual evidence remain future slices.
  Plan publication failure visibility is now durable: `learning_growth_plan_drafts`
  stores bounded latest publish-attempt status/error/stage, the publisher writes
  failed or policy-blocked attempts without marking drafts published, and plan
  audit plus cycle audit expose the attempt as summary-only DTO metadata.
  The profile-delta backend slice now adds
  `learning-profile-delta-service`, injects it into evaluation processing, and
  returns bounded `profile_delta` audit data after ledger/profile writes.
  Durable profile-delta audit persistence/readback is now implemented through
  `learning_growth_profile_delta_audits`, `profile-delta-audits.js`,
  `learning-profile-delta-audit-service`, and
  `GET /api/v1/growth/profile-delta-audits`.
  Plan audit readback is now implemented through
  `learning-plan-audit-service`, program-aware
  `learning_growth_plan_drafts` listing, and Owner context projection as
  `ownerAudit.planAudit` / `planAudit` with recent validated drafts, selected
  published items, generated task-card ids, generated graph-plan ids, basis
  evidence ids, and summary-only item reasons. The same service is now exposed
  through visible-target scoped `GET /api/v1/growth/learning-plans/audit`.
  Owner-reviewed profile correction is now implemented through
  `learning-owner-correction-service`, Owner-only
  `POST /api/v1/growth/profile-corrections`, and
  `GET /api/v1/growth/profile-corrections`. Corrections are stored as
  summary-only `owner_reviewed_correction` rows in
  `learning_growth_evidence_ledger`, require visible-target and
  target-provisioning checks, and are absorbed by Profile V2 as auditable state
  adjustments without deleting historical evidence.
  `npm run smoke:owner-audit` is the service-owned operational smoke for this
  boundary: it defaults to read-only cycle audit/completeness/evidence audit/
  profile-delta audit/correction readback through the normal service graph,
  and records a correction only with explicit
  `--operation correction --allow-write` through
  `learning-owner-correction-service.recordCorrection`. This is backend
  evidence only; embedded Owner audit/correction UI remains a separate product
  closure item.
  Profile V2 now includes expanded stale-evidence freshness: daily evidence and
  formal stage-assessment evidence use separate freshness windows,
  Owner-reviewed corrections do not refresh learner-evidence recency, stale
  strengths become low-pressure review hints instead of stretch claims, and
  planner context carries bounded `staleEvidence` summaries into
  `growth.learningPlanner.input.v1`.
  Owner plan preview UI, embedded domain-pack/subject selector, Owner
  provision controls, production planner smoke execution, and production
  planner deployment remain future slices.
- Platform `通宝` exchange, monthly Growth coin clearing, Action Inbox/Web Push
  handoff, and Owner manual decision flows remain in Home AI until their own
  migration stages are implemented and validated.

## Development Rule

Extract Growth code from the Home AI built-in module only through a documented
service/API boundary. Do not copy the Home AI server wholesale into this
workspace.
