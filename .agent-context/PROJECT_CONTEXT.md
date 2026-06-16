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
  score-proportional rewards without a pass-line gate. Ordinary generated daily
  cards validate `expectedTimeMinutes` within 10-15 minutes and persist
  `expected_duration_minutes_min=10` /
  `expected_duration_minutes_max=15`; stage assessment cards validate and
  persist the 25-30 minute formal-assessment range. The generated-card learner
  UI may expose at most one active text submission box per stage.
  Stage assessment cards are separate formal cards: activation is owned by
  `learning-stage-assessment-service`, formal evaluation writes higher-weight
  mastery evidence across declared assessment coverage nodes, and completed
  assessment cycles move into cooldown. Owner checkpoint controls are now
  exposed as a separate summary-only read model through
  `learning-stage-checkpoint-controls-service` and Owner-only
  `GET /api/v1/growth/stage-assessments/controls`; that read model delegates
  only to `learning-stage-assessment-service.stageReadiness()` and cannot
  activate assessments, publish plans, generate cards, call Gateway, inspect
  SQLite tables, or mutate learner state. The same boundary now has a no-write
  operational smoke through `npm run smoke:stage-checkpoint-controls`, which
  delegates only to `learningStageCheckpointControlsService.controls()` through
  the normal service graph and feeds `stageCheckpointControlsEvidence` into
  release evidence bundles/readiness. The embedded Owner generation panel now
  fetches that controls DTO through `GET /api/v1/growth/stage-assessments/controls`,
  displays bounded readiness evidence, and enables formal-checkpoint generation
  only when the `activate_stage_assessment` action is enabled; the actual write
  still goes through `POST /api/v1/growth/stage-assessments/activate`. The next
  target architecture is the
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
  `targetProvisioning` for domain-pack and subject selection. The embedded
  Owner `生成` tab now renders those selectors, applies selected
  domain-pack/subject context refresh, and can explicitly create/update
  target provisions through the Owner-only
  `POST /api/v1/growth/domain-pack-provisions` facade. The planner
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
  Profile V2 feedback; it also projects the completed cycle through
  `learning-loop-state-service` as `ready_to_draft` with a `draft_daily_plan`
  next action from persisted profile-delta/trajectory evidence. That same
  harness now continues the completed Fanfan science cycle into a
  summary-only automation proposal, Owner acceptance, read-only scheduler
  `would_publish`, and a pending digest required action without automatic
  publish, writeful scheduler execution, or extra authoring/evaluation Gateway
  calls after the completed source card. The staged
  delivery roadmap for the supervised AI learning system is now summarized first in
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
  records as `releaseReview.persistedApprovalKeys`; `releaseReview` now also
  includes summary-only remediation fields `missingCheckKeys`,
  `blockedCheckKeys`, `missingEvidenceKeys`, `requiredActionCount`,
  `requiredActions`, and `nextAction` so Owner/release tooling can see what
  evidence remains without walking raw checks. Release approval service and
  SQLite repository privacy scanning reject privacy-risk keys plus private
  path/token-looking string values before approval records persist. Approval
  records and remediation remain advisory evidence and never flip runtime
  config. Release-readiness also projects summary-only `evidenceReadback`
  (`growth.learningAutomationReleaseReadiness.evidenceReadback.v1`) with source
  bundle readback, present/missing counts, missing check keys, and bounded
  per-check evidence references. For `ownerReviewEvidence`, the readback item
  now also carries bounded `ownerReviewStageSummary` counters from the release
  evidence bundle summary without raw dependency ids; this is audit visibility
  only and does not change readiness pass semantics or scheduler permission.
  Owner snapshots persist that readback in
  `learning_growth_automation_release_readiness.evidence_readback_json`, and
  repository privacy scanning rejects private path/token-like values even when a
  caller bypasses the service. Release controls, inventory, and dashboard
  readbacks now project bounded evidenceReadback summaries only, including
  present/missing counts, source bundle ids/status/counts, and the compact
  `ownerReviewStageSummary` when present, without exposing full evidence items
  or changing release/runtime state. It now treats
  production controlled daily-loop draft/publish smoke evidence as a separate
  required readiness check, treats production cycle-history smoke evidence as a
  separate required readiness check, and treats production learner daily-cycle
  smoke evidence as a separate required readiness check while still never
  calling daily-loop, cycle-history, or learner-cycle services from the
  release-readiness boundary. It now also treats bounded release-workbench
  smoke/readback evidence as a separate required readiness check after
  `npm run smoke:release-workbench` or the explicit `release_workbench`
  release evidence bundle task. It now also treats backend Owner automation
  review evidence as `owner_review_evidence` after
  `npm run smoke:owner-review-evidence`, the default `owner_review_evidence`
  release evidence bundle task, the `--owner-review-evidence` readiness flag,
  or a persisted `owner_review_evidence` release evidence record. This evidence
  proves backend readback only and does not replace product UI or visual
  evidence. Owner review evidence now also projects bounded proposal lifecycle
  counts for `proposed`, `accepted`, `skipped`, `expired`, `superseded`,
  owner-decision, and proposal execution statuses; only `accepted` proposals
  satisfy the accepted-proposal gate. Its release evidence bundle summary also
  projects downstream digest, action-handoff, scheduler execution, scheduler
  run, worker-target, and failure-policy stage counts without raw dependency
  rows or ids. The supervised automation P5-P9 SQLite
  repository chain now
  applies repository-level privacy scanning for privacy-risk keys, private
  path/token-looking string values, and non-summary privacy classes before any
  automation evidence persists. The covered repositories are proposal, digest,
  failure policy, action handoff, scheduler execution, scheduler run, worker
  target, and worker lease. This is a database-boundary hardening slice only:
  it does not enable scheduler execution, publish accepted proposals, call
  Gateway, generate/evaluate cards, activate stage assessments, flip runtime
  config, or deliver platform actions. The P10 release/runtime persistence
  chain now has the same private value guard at repository boundaries:
  release-readiness snapshot, release approval, release evidence,
  collection-run, release decision, release package, release activation, and
  runtime enablement records reject privacy-risk keys, private path values,
  token-looking string values, and non-summary privacy classes before
  persistence.
  Activation and runtime enablement repositories additionally keep runtime
  mutation flags blocked. It now also has
  `npm run smoke:release-readiness`, a service-owned CLI that defaults to
  no-write readiness evaluation, accepts
  `--stage-checkpoint-evidence` after
  `npm run smoke:stage-assessment` has produced bounded read-only stage
  checkpoint evidence, accepts
  `--automation-digest-ui-evidence`,
  `--automation-action-handoff-ui-evidence`,
  `--scheduler-execution-ui-evidence`, `--scheduler-run-ui-evidence`, and
  `--scheduler-worker-target-ui-evidence` as Owner automation UI evidence
  flags, accepts
  `--release-workbench-evidence` as final Owner action-template readback
  evidence, accepts `--owner-review-evidence` as backend Owner automation
  review readback evidence, accepts
  `--production-proposal-smoke-evidence` after
  `npm run smoke:proposal` has produced bounded read-only production proposal
  evidence, accepts
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
  `--production-cycle-history-smoke-evidence` after
  `npm run smoke:cycle-history` has produced bounded no-write production
  cycle-history readback evidence, accepts
  `--production-owner-audit-smoke-evidence` after
  `npm run smoke:owner-audit` has produced bounded no-write Owner audit
  readback evidence, accepts
  `--production-profile-feedback-smoke-evidence` after
  `npm run smoke:profile-feedback` has produced bounded no-write completed-cycle
  profile-feedback evidence, accepts
  `--production-daily-loop-write-smoke-evidence` as a bounded evidence flag
  or from an explicit release evidence bundle `daily_loop_write` task,
  accepts `--production-learner-cycle-smoke-evidence` after
  `npm run smoke:learner-cycle` has produced bounded no-write production
  learner-cycle audit evidence, or from the default release evidence bundle
  `learner_cycle` task,
  accepts `--production-scheduler-dry-run-smoke-evidence` after
  `npm run smoke:scheduler-dry-run` has produced bounded no-write production
  scheduler dry-run evidence, and also performs an internal no-write scheduler
  dry-run safety check from the release-readiness service,
  accepts versioned `growth.learningAutomationReleaseEvidenceBundle.v1`
  evidence bundles through `--evidence-bundle-file` or
  `--evidence-bundle-json`, and accepts external
  `releaseEvidenceBundleAudit` evidence from
  `npm run smoke:release-evidence-bundle-audit`. Growth now also has
  `npm run smoke:release-evidence-bundle`, a service-owned bundle builder
  that runs selected no-write/default-disabled smoke CLIs, emits a
  summary-only `growth.learningAutomationReleaseEvidenceBundle.v1` artifact,
  includes learning-loop state smoke, cycle-history smoke, Owner audit smoke,
  profile-feedback smoke, learner-cycle audit smoke, stage-assessment readiness
  smoke, stage-checkpoint controls readback smoke, platform action evidence,
  central visual evidence, proposal smoke, and backend Owner automation review
  evidence with proposal lifecycle plus downstream automation-stage counts in
  the default task set, and now also collects the
  read-only release approval bag through
  `npm run smoke:release-approval -- --operation bag`,
  and can feed `npm run smoke:release-readiness -- --evidence-bundle-file`
  without hand-splicing JSON in Codex. It also exposes an opt-in
  `learner_cycle` task that is part of the default set but allows only
  no-write `audit`; non-audit learner-cycle operations are blocked with a
  pointer to run `npm run smoke:learner-cycle` directly because write
  operations require Owner-requested real learner evidence and raw text must
  not pass through the bundle. It also exposes an opt-in
  `daily_loop_write` task for controlled daily-loop draft/publish smoke
  evidence; the task is outside the default set, fails closed without
  `--allow-write-evidence`, requires `--daily-loop-write-operation draft` or
  `publish`, requires `--plan-draft-id` for publish, and then delegates to the
  existing `scripts/smoke-growth-daily-loop.js` write gate instead of calling
  daily-loop services directly. The builder maps persisted approvals into the
  versioned bundle `releaseApproval` field only and maps profile-feedback smoke
  into `productionProfileFeedbackSmokeEvidence`, cycle-history smoke into
  `productionCycleHistorySmokeEvidence`, Owner audit smoke into
  `productionOwnerAuditSmokeEvidence`, platform action evidence from delivered
  Growth event-outbox receipts into `platformActionEvidence`, central Home AI
  visual harness artifact validation into `centralVisualEvidence`, controlled daily-loop write smoke into
  `productionDailyLoopWriteSmokeEvidence`, learner-cycle audit smoke into
  `productionLearnerCycleSmokeEvidence`, and explicit non-default release
  workbench smoke into `releaseWorkbenchSmokeEvidence`, and backend Owner
  automation review evidence into `ownerReviewEvidence`; it does not write
  business state of its own, does not call Gateway, and does not change
  release-readiness or scheduler permission. The same builder now also exposes
  an explicit non-default `release_controls` task that runs
  `npm run smoke:release-controls`, accepts activation gates, approval keys,
  UI evidence flags, and audit-record limits, and stores bounded
  `releaseControlsSmokeEvidence` for final no-write readback packaging; task
  pass means readback collection succeeded, while the nested controls status
  remains the release-control source of truth. Growth now also has
  `npm run smoke:release-dashboard`, a no-write Owner/visible-target read model
  implemented by `learning-automation-release-dashboard-service`,
  `scripts/smoke-growth-release-dashboard.js`, and
  `GET /api/v1/growth/automation/release-dashboard`. It composes only
  release-readiness, release-controls, and release-inventory DTOs into one
  summary-only `growth.learningAutomationReleaseDashboard.v1` status,
  next-action, and artifact readback surface for Owner UI/release audit use. It
  owns no repository/table, calls no Gateway/model provider, writes no business
  state, and keeps all runtime mutation and scheduling permission flags false.
  The release evidence bundle can also collect it explicitly through the
  non-default `release_dashboard` task, which stores bounded
  `releaseDashboardSmokeEvidence` as final readback packaging only.
  The release evidence bundle can also collect the final workbench action
  template readback explicitly through the non-default `release_workbench`
  task, which stores bounded `releaseWorkbenchSmokeEvidence`; task pass means
  the read model was collected, not that release, runtime config, or scheduling
  state changed.
  Growth now also has `npm run smoke:release-workbench`, a no-write
  Owner/visible-target action-template read model implemented by
  `learning-automation-release-workbench-service`,
  `scripts/smoke-growth-release-workbench.js`, and
  `GET /api/v1/growth/automation/release-workbench`. It composes only
  release-readiness, release-controls, release-inventory, and
  release-dashboard DTOs into one summary-only
  `growth.learningAutomationReleaseWorkbench.v1` surface for Owner release UI.
  It reports bounded read routes, Owner-only record-route templates, missing
  evidence/check/approval/record summaries, one next action, and external
  manual-runtime-config follow-up hints without applying config. It owns no
  repository/table, calls no Gateway/model provider, writes no business state,
  and keeps all runtime mutation and scheduling permission flags false.
  Growth now also has `npm run smoke:release-workbench-action`,
  `learning-automation-release-workbench-action-service`, and Owner-only
  `POST /api/v1/growth/automation/release-workbench/actions` as the write-gated
  action facade over that workbench. The facade reads the workbench first,
  requires the requested endpoint to be advertised, then delegates only to
  existing release evidence, release approval, release package-record, release
  activation, or runtime enablement record services. It requires only the
  selected endpoint's write service instead of requiring every possible
  release-workbench action dependency at construction time. It stores/passes only
  summary-only bounded action/evidence/approval/decision data and does not
  build packages, create readiness snapshots, record collection runs, record
  release decisions, call Gateway/model providers, publish, schedule, mutate
  runtime config, grant scheduler permission, or mutate learner state.
  The embedded Owner `生成` UI now consumes the release workbench read model and
  action facade through `public/growth-api-client.js`, renders
  `data-release-workbench-panel`, and can record advertised
  `release_evidence`, `release_approval`, `release_activation`, and
  `runtime_enablement` actions from the plugin UI. It intentionally does not
  record `release_package` from the workbench template because package record
  writes require a real release package artifact, not a placeholder body.
  Missing-package workbench actions now include a bounded preparation route for
  Owner-triggered release package candidate build before any package-record
  write.
  Release-readiness writes a summary-only advisory
  snapshot only when `--write-snapshot` is explicitly supplied. Growth now also
  has `npm run smoke:release-evidence-bundle-audit`, a service-owned read-only
  audit over a previously generated bundle. It validates bundle schema,
  `summary_only`, default task coverage, pass counts, required evidence keys,
  privacy-risk keys, and private path/value leaks, emits
  `growth.learningAutomationReleaseEvidenceBundleAudit.v1`, and intentionally
  stays outside the bundle being audited to avoid circular release artifacts.
  Growth now also has `npm run smoke:release-package`, a service-owned release
  evidence package builder plus package audit-record boundary implemented by
  `learning-automation-release-package-service` and
  `scripts/build-growth-release-package.js`. It composes the release evidence
  bundle builder, bundle self-audit, release-readiness evaluation,
  collection-run evaluation or explicit `--write-collection-run --allow-write`
  persistence, release-controls readback, and release-dashboard readback into
  one summary-only `growth.learningAutomationReleasePackage.v1` artifact. The
  package may also write a summarized package audit record through
  `automation-release-packages.js` into
  `learning_growth_automation_release_packages` only with
  `--write-package-record --allow-write`; package records include bounded
  `releaseDashboardSummary` in `release_dashboard_summary_json`, including
  readiness-evidence present/missing counts, source bundle id, latest readiness
  snapshot id, latest snapshot evidence counts, compact Owner review
  stage-summary counters when present, and persisted evidence keys.
  The
  release review, authorization, closure, controls, inventory, and dashboard
  readbacks project that dashboard summary as latest-package dashboard status,
  next-action key, required-action count, step count, and bounded readiness
  evidence count/source readbacks without exposing raw package artifacts; after
  an approved release decision, release review and authorization require a
  matching readable package audit record with
  `packageRecordStatus=ready_for_release_review`, while package dashboard
  fields remain readback only. The
  visible-target scoped
  `GET /api/v1/growth/automation/release-packages` and Owner-only
  `POST /api/v1/growth/automation/release-packages/build` expose explicit
  package candidate build from the plugin HTTP boundary. The build route uses a
  build-capable package service instance wired to the release evidence bundle
  service's injected runner plus bundle-audit/readiness/collection-run/
  controls/dashboard services; it can return blocked summary-only candidates
  for Owner audit but does not persist package records. Owner-only
  `POST /api/v1/growth/automation/release-packages` records existing package
  artifacts only and does not run package smoke tasks. The package boundary
  never flips runtime config, grants scheduler permission, calls Gateway,
  publishes, evaluates, schedules, delivers notifications, activates stage
  assessments, mutates learner state, or deploys.
  Growth now also has `npm run smoke:release-collection-run`, a service-owned
  release collection-run boundary over bundle, bundle-audit, and
  release-readiness artifacts. It delegates to
  `learning-automation-release-collection-run-service`, evaluates
  `growth.learningAutomationReleaseCollectionRun.v1` no-write by default,
  strips artifact paths to file names, writes
  `learning_growth_automation_release_collection_runs` only with
  `--write-record`, and exposes visible-target scoped
  `GET /api/v1/growth/automation/release-collection-runs` plus Owner-only
  `POST /api/v1/growth/automation/release-collection-runs`. It is release
  evidence, not a scheduler permission or Home AI platform release switch.
  Growth now also has `npm run smoke:release-decision`, a service-owned Owner
  release-decision boundary after a collection run exists. It delegates to
  `learning-automation-release-decision-service`, evaluates
  `growth.learningAutomationReleaseDecision.v1` no-write by default, persists
  `learning_growth_automation_release_decisions` only with explicit
  `--allow-write`/`--write-record`, and exposes visible-target scoped
  `GET /api/v1/growth/automation/release-decisions` plus Owner-only
  `POST /api/v1/growth/automation/release-decisions`. Approved decisions
  require a ready summary-only collection run and remain advisory:
  `writefulSchedulingAllowed=false`, no runtime config flip, and no scheduler
  permission. Growth now also has `npm run smoke:release-review` and
  visible-target scoped `GET /api/v1/growth/automation/release-review`, a
  no-write summary-only readback that composes current release-readiness,
  latest release collection run, latest Owner decision, latest persisted
  release-package audit record, and release approval bag through service
  boundaries for future Owner UI/release controls. Package record readback is
  explicit advisory evidence (`packageRecordStatus`, `latestPackage`, and
  bounded `packageReadback` dashboard summary fields) and is not a hard
  authorization gate in this stage. It does not write tables, call Gateway,
  run smoke tasks, flip runtime config, or schedule work. Growth now
  also has
  `learning-automation-release-authorization-service`,
  `npm run smoke:release-authorization`, and visible-target scoped
  `GET /api/v1/growth/automation/release-authorization`. This is the final
  summary-only authorization readback consumed by scheduler execution: it
  requires an approved `growth.learningAutomationReleaseReview.v1`, a ready
  latest collection run, an approved latest decision, and an active
  `writefulExecutionApproval` key. It keeps
  `writefulSchedulingAllowed=false` and `runtimeConfigChange=false`, writes no
  tables, and flips no runtime config. When
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`, scheduler execution
  now rechecks this authorization after delivered handoff, reviewed digest,
  failure-policy, and scheduler dry-run gates. Authorization alone is still
  insufficient for publication: execution also requires a later activation
  audit record readback. Growth now also has
  `learning-automation-release-closure-service`,
  `npm run smoke:release-closure`, and visible-target scoped
  `GET /api/v1/growth/automation/release-closure`. This no-write summary
  readback composes release-review plus release-authorization summaries into
  `growth.learningAutomationReleaseClosure.v1`, including package-record
  readback status, `latestPackage`, `backendEvidenceComplete`,
  `readyForOwnerReleaseActivation`, missing check/evidence/approval keys,
  required actions, and one next action while still keeping
  `writefulSchedulingAllowed=false` and `runtimeConfigChange=false`. Growth
  now also has
  `learning-automation-release-activation-service`,
  `npm run smoke:release-activation`, and visible-target scoped
  `GET /api/v1/growth/automation/release-activation`. This no-write activation
  preflight composes release-closure readback with selected runtime config
  gates (`writeful_execution`, `background_scheduler`, `background_worker`),
  approval keys, current config booleans, required actions, and one next action
  into `growth.learningAutomationReleaseActivation.v1`. It can report
  `readyForOwnerRuntimeConfigDecision=true`, but it applies no config and keeps
  `configChangeApplied=false`, `writefulSchedulingAllowed=false`, and
  `runtimeConfigChange=false`. Growth also has visible-target scoped
  `GET /api/v1/growth/automation/release-activations`, Owner-only
  `POST /api/v1/growth/automation/release-activations`, and
  `npm run smoke:release-activation -- --operation record --allow-write` for
  summary-only activation audit records in
  `learning_growth_automation_release_activations`. These records capture
  Owner intent and preflight evidence only; they do not flip runtime config,
  grant scheduler permission, or run scheduling. When
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`, scheduler execution now
  reads these records through `learning-automation-release-activation-service`
  and requires a valid summary-only `writeful_execution` record before it can
  publish. Missing, blocked, privacy-invalid, non-record-only, or
  runtime-mutating activation records produce blocked execution metadata.
  Growth now also has
  `learning-automation-runtime-enablement-service`,
  `automation-runtime-enablements.js`,
  `learning_growth_automation_runtime_enablements`,
  visible-target scoped `GET /api/v1/growth/automation/runtime-enablement`,
  visible-target scoped `GET /api/v1/growth/automation/runtime-enablements`,
  Owner-only `POST /api/v1/growth/automation/runtime-enablements`, and
  `npm run smoke:runtime-enablement`. This is the final Growth-local
  record-only runtime enablement audit/readback boundary after release
  activation: it validates activation audit records for selected gates, reads
  injected current runtime config booleans, and can report
  `activation_record_required`, `activation_record_invalid`,
  `ready_for_manual_runtime_config_enablement`, `partial_config`, or
  `verified_enabled`, while still applying no config and keeping all runtime
  mutation/scheduling permission flags false.
  Growth now also has the no-write Owner release-controls aggregate:
  `learning-automation-release-controls-service`, visible-target scoped
  `GET /api/v1/growth/automation/release-controls`, and
  `npm run smoke:release-controls`. It composes release readiness, release
  review, release closure, release activation, runtime enablement, and bounded
  persisted activation/runtime enablement audit-record summaries through
  existing services into `growth.learningAutomationReleaseControls.v1`, reports
  the first blocking ladder status plus bounded required actions and one next
  action, exposes `auditReadback` plus `activation_records` /
  `runtime_enablement_records` steps, owns no repository/table, writes no
  records, runs no smoke tasks, and still applies no runtime config, grants no
  scheduler permission, publishes no cards, calls no Gateway, and keeps all
  runtime mutation/scheduling flags false.
  Scheduler dry-run now
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
  and now includes nested `growth.learningLoopState.recommendationEvidence.v1`
  trace linking bounded evidence ids, source card/evaluation ids, plan drafts,
  profile-delta audits, Owner corrections, Profile V2 summaries, and
  trajectory recommendation lifecycle rows that explain the next
  recommendation,
  without Gateway calls, plan publication, card generation, evaluation,
  scheduling, stage activation, direct repository access, SQLite writes, or
  learner-state mutation. Profile-feedback evidence now also has
  `npm run smoke:profile-feedback`, a service-owned no-write CLI that delegates
  to `learning-profile-feedback-evidence-service` through the normal service
  graph. It requires a bounded completed-cycle selector and returns
  `growth.learningProfileFeedbackEvidence.v1` summary-only evidence from audit
  completeness, persisted evidence, persisted profile delta, Profile V2,
  recommendation, and next loop-state readback without Gateway calls, plan
  publication, card generation, evaluation, scheduling, stage activation,
  direct repository access, SQLite writes, or learner-state mutation. The Owner
  Recommendation lifecycle readback now also has
  `learning-recommendation-lifecycle-service`,
  `GET /api/v1/growth/recommendations/lifecycle`, and
  `npm run smoke:recommendation-lifecycle`. This is a summary-only no-write
  readback over persisted card trajectory recommendation lifecycle rows:
  pending, accepted, superseded, source card/evaluation, generated card/plan,
  bounded target nodes, and aggregate counts. It feeds release evidence as
  `productionRecommendationLifecycleSmokeEvidence` /
  `production_recommendation_lifecycle_smoke_evidence`, rejects write flags in
  the smoke CLI, and does not call Gateway, publish, generate, evaluate,
  schedule, notify, activate stage assessments, inspect SQLite tables directly
  outside the repository, or mutate learner state. The Owner
  `生成` tab now reads the same
  `GET /api/v1/growth/learning-loop/state` route after generation context load
  and exposes a minimal supervised daily-loop operation path: `规划下一张`
  calls `POST /api/v1/growth/daily-loop/draft`, renders a bounded plan draft
  preview, and `发布为卡片` calls
  `POST /api/v1/growth/daily-loop/publish` before refreshing board,
  card-generation context, and learning-loop state. It now also renders
  `ownerAudit` from the card-generation context, including plan audit,
  persisted profile-delta summaries, correction history, and a bounded Owner
  correction form that calls
  `POST /api/v1/growth/profile-corrections` before refreshing context and
  learning-loop state. The browser still does not call Gateway directly,
  compute learning policy, mutate Profile V2 locally, or publish automatically.
  Controlled daily-loop
  draft/publish smoke evidence is
  now available through `npm run smoke:daily-loop`; it defaults to preview, and
  `draft` or `publish` operations require the explicit `--allow-write` flag.
  That CLI still delegates only through `learning-daily-loop-service` and the
  normal service graph; it does not import repositories, call Gateway directly,
  call the plan publisher or card generator directly, run schedulers, deliver
  notifications, or activate stage assessments. Learner daily-card cycle smoke
  evidence is now available through `npm run smoke:learner-cycle`, backed by
  `learning-learner-cycle-service`. It defaults to no-write `audit` and returns
  summary-only cycle audit/completeness; `submit`, `evaluate`, `reflect`, and
  `full` require explicit `--allow-write` and delegate through the normal
  Growth service graph for submission, evaluation queue processing, reflection,
  profile/evidence/profile-delta effects, and audit readback. The smoke output
  must not echo learner text, reflections, transcripts, prompts, answer keys,
  raw model output, credentials, or provider config. Its harness now also
  chains a write-gated `full` learner-cycle smoke into a no-write
  `smoke-growth-learning-loop-state` read against the same temporary DB,
  proving the operational smoke artifacts can feed the next planning action
  without exposing raw learner/model content. Audit-completeness privacy
  projection now scans public DTO keys for raw/private field names instead of
  scanning arbitrary text values, so safe public vocabulary does not block a
  summary-only cycle while raw prompt, transcript, answer-key, private-path,
  provider-config, credential, cookie, token, or password keys still block
  readiness. Target provisioning smoke
  evidence is available through `npm run smoke:target-provisioning`; it
  delegates only to `learning-target-provisioning-service`, defaults to
  read-only resolve, requires explicit `--allow-write` for provision writes,
  and covers cross-subject domain-pack plus subject-domain selection such as
  `domain_pack_fanfan_cambridge_pathway_v1` with `subject=science`. It is now
  also part of the default release evidence bundle as `target_provisioning`,
  maps to `productionTargetProvisioningSmokeEvidence`, and feeds
  release-readiness as `production_target_provisioning_smoke_evidence` so
  multi-workspace/domain-pack rollout cannot pass release review without
  bounded target-resolution evidence. Formal checkpoint operational
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
  Profile V2/profile-delta rows. The same target-resolution evidence is now
  collected by the default release evidence bundle and represented in
  release-readiness before any production scheduling decision.
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
  Selectable learning-cycle history is now implemented through
  `learning-cycle-history-service`, visible-target scoped
  `GET /api/v1/growth/learning-cycles/history`, and
  `npm run smoke:cycle-history`; it composes public plan-audit,
  evidence-audit, profile-delta-audit, correction, and optional completeness
  DTOs into bounded `growth.learningCycleHistory.v1` rows for Owner history
  selection without writes, Gateway calls, direct repository access,
  publication, generation, evaluation, scheduling, notification delivery,
  stage activation, or learner-state mutation. The embedded Owner `生成` tab now
  consumes those rows through `growth-api-client.js`, renders selectable
  historical cycles, and uses only the selected row's service-provided selectors
  to refresh `learning-cycles/audit` plus `learning-cycles/completeness`; browser
  code must not reconstruct history from raw rows.
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
  decisions. `npm run smoke:proposal` is implemented as a service-owned
  operational smoke; it defaults to read-only proposal list, gates
  create/review/publish with explicit `--allow-write`, and delegates only to
  `learning-automation-proposal-service`. Focused proposal
  repository/service/route/script/architecture harnesses pass. The embedded
  Owner `生成` tab now has the first proposal review panel over the existing
  proposal routes: it can create a bounded proposal from the selected
  historical cycle, lists bounded proposals for the selected visible target and
  scoped learner/domain-pack/subject, records `accepted` or `skipped`
  decisions, and can explicitly publish an already accepted proposal through
  `POST /api/v1/growth/automation/proposals/:proposalId/publish`. This panel
  uses the selected cycle's service-provided selectors, does not call Gateway
  directly, does not call card generation directly, does not run schedulers,
  does not activate stage assessments, and does not mutate learner state
  outside the existing proposal create/decision/publish service boundaries.
  `expired`/`superseded` decision UI, digest/action/execution UI, and
  production visual/release evidence remain later slices.
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
  rollback/failure policy, action handoff, real production platform
  Action Inbox/Web Push receipt evidence, visual evidence, and explicit release
  evidence are implemented and covered by harness.
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
  Backend-only Owner automation evidence is now implemented through
  `learning-automation-owner-review-evidence-service`,
  visible-target scoped
  `GET /api/v1/growth/automation/owner-review-evidence`, and
  `npm run smoke:owner-review-evidence`. It owns no repository/table, reads
  only existing proposal, digest, failure-policy, action-handoff, scheduler
  execution/run, worker-target, and release-readiness service DTOs, returns
  `growth.learningAutomationOwnerReviewEvidence.v1` summary-only evidence, and
  keeps all writeful scheduling/runtime flags false. This is backend evidence
  only and does not replace proposal/digest/action/execution UI or central
  visual evidence.
  The automation scheduler execution backend is now implemented through
  `learning-automation-scheduler-execution-service`,
  `automation-scheduler-executions.js`,
  `learning_growth_automation_scheduler_executions`, visible-target scoped
  `GET /api/v1/growth/automation/scheduler/executions`, and Owner-only
  `POST /api/v1/growth/automation/scheduler/execute-once`. It supports only
  `owner_explicit_once`, defaults disabled through
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=false`, records bounded blocked
  execution when disabled, rechecks delivered handoff, reviewed digest, active
  failure-policy readiness, scheduler dry-run, final release authorization, and
  valid `writeful_execution` activation audit readback plus a matching
  persisted `verified_enabled` runtime enablement readback before publication
  when enabled, and delegates only to accepted-proposal publish. It is not a
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
  output for UI/harness use. It also exposes nested summary-only
  `growth.learningLoopState.recommendationEvidence.v1` so Owner/release
  tooling can explain the next recommendation from persisted summary links
  without rejoining raw tables or model output. The AI-loop harness now covers
  post-cycle readback from a completed Fanfan science daily card into the next
  planning action. It is no-write, summary-only, and does not call
  Gateway, publish plans, generate cards, evaluate submissions, run schedulers,
  deliver notifications, activate stage assessments, or inspect SQLite tables.
  The Owner stage-checkpoint controls read is now implemented through
  `learning-stage-checkpoint-controls-service` and Owner-only
  `GET /api/v1/growth/stage-assessments/controls`. It projects
  `growth.stageCheckpointControls.v1`, bounded readiness evidence, cooldown
  status, policy flags, and route templates for refresh, Owner activation, and
  learner challenge without performing any write or activation itself.
  `npm run smoke:daily-loop` now provides a controlled local/production smoke
  entry for the same service boundary: preview is the default no-write
  operation, while `--operation draft` and `--operation publish` are rejected
  unless `--allow-write` is present; publish also requires a selected
  `--plan-draft-id`. This complements the no-write
  `npm run smoke:daily-loop-preview` command.
  Embedded UI consumption remains a future slice. Central visual evidence now
  has a Growth-owned read-only ingestion boundary through
  `npm run smoke:central-visual-evidence`; the real production artifact still
  must be produced by the Home AI central visual toolchain before release.
  The ingestion service accepts raw Home AI visual artifact paths only as input
  for deriving basenames/booleans; public scope and projected public visual
  summaries are scanned for private path/token-looking values, and failed DTOs
  are redacted before release-bundle or readiness consumers see them.
  Release ladder public readbacks are now consistently privacy guarded:
  `learning-automation-release-review-service`,
  `learning-automation-release-authorization-service`,
  `learning-automation-release-closure-service`, and
  `learning-automation-release-activation-service` scan public inputs,
  dependency outputs, and final public DTOs for private path/token-looking
  values in addition to privacy-risk keys. Activation also scans saved
  activation output and list readback before returning repository rows.
  Failures return bounded finding paths only and do not echo private values.
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
  `learning-owner-correction-service.recordCorrection`. The embedded Owner
  `生成` tab now consumes the same context-level audit/correction DTOs and can
  write bounded correction evidence. It also renders current-card
  single-cycle `learning-cycles/audit` and `learning-cycles/completeness`
  drilldown through the browser API client, using only bounded ids, summary
  counts, timeline rows, findings, and missing-required state.
  Profile V2 now includes expanded stale-evidence freshness: daily evidence and
  formal stage-assessment evidence use separate freshness windows,
  Owner-reviewed corrections do not refresh learner-evidence recency, stale
  strengths become low-pressure review hints instead of stretch claims, and
  planner context carries bounded `staleEvidence` summaries into
  `growth.learningPlanner.input.v1`.
  Owner target/domain-pack provision controls were deployed to Mac production
  on 2026-06-15 at Growth commit `ffabbbf4ef55`. Production smoke passed for
  manifest/status/static-version, central `embedded-plugin-shell` visual
  evidence, production Gateway planner readiness, daily-loop preview,
  learning-loop state, and release-readiness Owner-loop aggregation. A later
  2026-06-15 production operation provisioned Fanfan science for
  `domain_pack_fanfan_cambridge_pathway_v1` / `science` and published one
  Owner-supervised daily card; production learner-cycle writes remain gated
  behind explicit Owner-provided learner evidence.
  Older-cycle selection over the implemented current-cycle drilldown, browser
  formal stage-checkpoint UI over the implemented controls read model,
  proposal/digest/action/execution UI, real production
  platform Action Inbox/Web Push receipt evidence, and full automation release
  review remain future slices.
- Platform `通宝` exchange, monthly Growth coin clearing, Action Inbox/Web Push
  handoff, and Owner manual decision flows remain in Home AI until their own
  migration stages are implemented and validated.

## Development Rule

Extract Growth code from the Home AI built-in module only through a documented
service/API boundary. Do not copy the Home AI server wholesale into this
workspace.
